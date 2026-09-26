import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PRODUCTS as FALLBACK_PRODUCTS } from "../src/data/products.mock.ts";
import type { Product } from "../src/types/product.type.ts";
import {
  isBlankRow,
  parseRow,
  serializeProducts,
  sortProducts,
  validateBrands,
  validateHeader,
  type AcceptedProduct,
  type CatalogWarning,
} from "./catalog-data.ts";

type FetchResponse = {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
};

type Fetcher = (url: URL) => Promise<FetchResponse>;

type SheetRow = {
  line: number;
  cells: readonly unknown[];
};

export type BuildOptions = {
  env?: NodeJS.ProcessEnv;
  fetcher?: Fetcher;
  forceFallback?: boolean;
};

export type BuildResult = {
  products: Product[];
  warnings: CatalogWarning[];
  rejected: number;
  usedFallback: boolean;
  output: string;
};

export class CatalogBuildError extends Error {}

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const outputPath = path.join(projectRoot, "src/data/products.generated.ts");

function selectedSheetTab(env: NodeJS.ProcessEnv): string {
  return (
    env.CATALOG_SHEET_TAB ??
    (env.VERCEL_ENV === "production" ? "produtos" : "produtos_preview")
  );
}

function isRows(value: unknown): value is unknown[][] {
  return Array.isArray(value) && value.every((row) => Array.isArray(row));
}

function endpoint(spreadsheetId: string, range: string, apiKey: string): URL {
  const url = new URL(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}`,
  );
  url.searchParams.set("key", apiKey);
  url.searchParams.set("valueRenderOption", "UNFORMATTED_VALUE");
  return url;
}

async function fetchRows(
  spreadsheetId: string,
  range: string,
  apiKey: string,
  fetcher: Fetcher,
): Promise<unknown[][]> {
  let response: FetchResponse;

  try {
    response = await fetcher(endpoint(spreadsheetId, range, apiKey));
  } catch {
    throw new CatalogBuildError(`falha de rede ao buscar ${range}`);
  }

  if (!response.ok) {
    throw new CatalogBuildError(
      `Sheets API respondeu HTTP ${response.status} para ${range}`,
    );
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new CatalogBuildError(
      `Sheets API devolveu JSON invalido para ${range}`,
    );
  }

  if (typeof body !== "object" || body === null) {
    throw new CatalogBuildError(
      `Sheets API devolveu corpo invalido para ${range}`,
    );
  }

  // Intervalo sem nenhuma célula preenchida volta sem a chave `values`.
  const values = "values" in body ? body.values : [];
  if (!isRows(values)) {
    throw new CatalogBuildError(
      `Sheets API devolveu corpo invalido para ${range}`,
    );
  }

  return values;
}

/** Descarta as linhas vazias preservando o número de linha da planilha. */
function productRowsOf(values: readonly (readonly unknown[])[]): SheetRow[] {
  return values
    .slice(1)
    .map((cells, index) => ({ line: index + 2, cells }))
    .filter(({ cells }) => !isBlankRow(cells));
}

function assertUniqueIds(rows: readonly SheetRow[]): void {
  const linesById = new Map<string, number>();

  rows.forEach(({ line, cells }) => {
    const value = cells[0];
    const id =
      typeof value === "string"
        ? value.trim()
        : typeof value === "number"
          ? String(value)
          : "";

    if (!id) {
      return;
    }

    const previousLine = linesById.get(id);
    if (previousLine !== undefined) {
      throw new CatalogBuildError(
        `id duplicado "${id}" nas linhas ${previousLine} e ${line}`,
      );
    }

    linesById.set(id, line);
  });
}

function fallbackResult(): BuildResult {
  return {
    products: FALLBACK_PRODUCTS,
    warnings: [],
    rejected: 0,
    usedFallback: true,
    output: serializeProducts(FALLBACK_PRODUCTS),
  };
}

export async function buildCatalog(
  options: BuildOptions = {},
): Promise<BuildResult> {
  const env = options.env ?? process.env;
  if (options.forceFallback) {
    return fallbackResult();
  }

  const spreadsheetId = env.GOOGLE_SHEETS_ID;
  const apiKey = env.GOOGLE_SHEETS_API_KEY;

  if (!spreadsheetId && !apiKey) {
    if (env.VERCEL) {
      throw new CatalogBuildError(
        "GOOGLE_SHEETS_ID e GOOGLE_SHEETS_API_KEY sao obrigatorias na Vercel",
      );
    }

    return fallbackResult();
  }

  if (!spreadsheetId || !apiKey) {
    throw new CatalogBuildError(
      "GOOGLE_SHEETS_ID e GOOGLE_SHEETS_API_KEY devem ser informadas juntas",
    );
  }

  const fetcher: Fetcher = options.fetcher ?? ((url) => fetch(url));
  const tab = selectedSheetTab(env);
  const [productRows, brandRows] = await Promise.all([
    fetchRows(spreadsheetId, `${tab}!A:J`, apiKey, fetcher),
    fetchRows(spreadsheetId, "_marcas!A:A", apiKey, fetcher),
  ]);

  if (!validateHeader(productRows[0] ?? [])) {
    throw new CatalogBuildError("cabecalho de produtos diverge do contrato");
  }

  const dataRows = productRowsOf(productRows);
  if (dataRows.length === 0) {
    throw new CatalogBuildError("a aba de produtos nao contem linhas de dados");
  }

  if (!validateBrands(brandRows)) {
    throw new CatalogBuildError("_marcas!A:A diverge das marcas do menu");
  }

  assertUniqueIds(dataRows);

  const warnings: CatalogWarning[] = [];
  const accepted: AcceptedProduct[] = [];
  let rejected = 0;

  dataRows.forEach(({ line, cells }, index) => {
    const parsed = parseRow(cells, line, index);
    warnings.push(...parsed.warnings);

    if (parsed.kind === "accepted") {
      accepted.push(parsed.value);
      return;
    }

    if (parsed.warnings.length > 0) {
      rejected += 1;
    }
  });

  if (rejected / dataRows.length > 0.2) {
    throw new CatalogBuildError(
      `disjuntor acionado: ${rejected}/${dataRows.length} linhas rejeitadas`,
    );
  }

  const products = sortProducts(accepted);
  return {
    products,
    warnings,
    rejected,
    usedFallback: false,
    output: serializeProducts(products),
  };
}

async function writeGenerated(output: string): Promise<void> {
  const temporaryPath = `${outputPath}.${process.pid}.tmp`;
  await mkdir(path.dirname(outputPath), { recursive: true });

  try {
    await writeFile(temporaryPath, output, "utf8");
    await rename(temporaryPath, outputPath);
  } finally {
    await rm(temporaryPath, { force: true });
  }
}

export async function run(options: BuildOptions = {}): Promise<BuildResult> {
  const result = await buildCatalog(options);
  await writeGenerated(result.output);

  if (result.usedFallback) {
    console.warn("[catalogo] sem credenciais; usando products.mock.ts");
  }

  for (const warning of result.warnings) {
    console.warn(`[catalogo] linha=${warning.line} aviso=${warning.message}`);
  }

  console.info(
    `[catalogo] produtos=${result.products.length} ignorados=${result.rejected}`,
  );

  return result;
}

if (import.meta.main) {
  void run({ forceFallback: process.argv.includes("--fallback") }).catch(
    (error: unknown) => {
      const message =
        error instanceof Error
          ? error.message
          : "erro desconhecido ao gerar catalogo";
      console.error(`[catalogo] erro=${message}`);
      process.exitCode = 1;
    },
  );
}
