import { CATALOG_NAV_ITEMS } from "../src/mocks/nav-item.mock.ts";
import { normalizeCatalogText } from "../src/utils/normalize-catalog-text.ts";
import type { Product } from "../src/types/product.type.ts";

export const EXPECTED_HEADERS = [
  "id",
  "marca",
  "titulo",
  "preco",
  "preco_promocional",
  "imagem_url",
  "ativo",
  "ordem",
  "destaque",
  "atualizado_em",
] as const;

export const CATALOG_BRANDS = CATALOG_NAV_ITEMS.flatMap((item) => item.brands);

const PRODUCT_DATA_COLUMNS = EXPECTED_HEADERS.indexOf("imagem_url") + 1;

export type CatalogWarning = {
  line: number;
  message: string;
};

export type AcceptedProduct = {
  product: Product;
  brandRank: number;
  order: number | undefined;
  rowIndex: number;
};

export type ParseRowResult =
  | { kind: "accepted"; value: AcceptedProduct; warnings: CatalogWarning[] }
  | { kind: "rejected"; warnings: CatalogWarning[] }
  | { kind: "inactive" };

function textCell(value: unknown): string {
  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number") {
    return String(value);
  }

  return "";
}

function isEmptyCell(value: unknown): boolean {
  return (
    value === undefined ||
    value === null ||
    (typeof value === "string" && value.trim() === "")
  );
}

/** Só A–F contam: as caixas de seleção fazem a API devolver a aba inteira. */
export function isBlankRow(row: readonly unknown[]): boolean {
  return row.slice(0, PRODUCT_DATA_COLUMNS).every(isEmptyCell);
}

function isFalse(value: unknown): boolean {
  return (
    value === false ||
    (typeof value === "string" && value.trim().toUpperCase() === "FALSE")
  );
}

function isTrue(value: unknown): boolean {
  return (
    value === true ||
    (typeof value === "string" && value.trim().toUpperCase() === "TRUE")
  );
}

/** Célula vazia conta como inativa: apagar a caixa de seleção remove a caixa. */
function activeState(value: unknown): "active" | "inactive" | "invalid" {
  if (isTrue(value)) {
    return "active";
  }

  if (isFalse(value) || isEmptyCell(value)) {
    return "inactive";
  }

  return "invalid";
}

function validPositiveNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function optionalOrder(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    return undefined;
  }

  return value;
}

export function validateHeader(header: readonly unknown[]): boolean {
  return (
    header.length === EXPECTED_HEADERS.length &&
    header.every((value, index) => value === EXPECTED_HEADERS[index])
  );
}

export function validateBrands(rows: readonly (readonly unknown[])[]): boolean {
  const values = rows.map((row) => row[0]);
  const brands = values[0] === "marca" ? values.slice(1) : values;

  return (
    brands.length === CATALOG_BRANDS.length &&
    brands.every((value, index) => value === CATALOG_BRANDS[index])
  );
}

/** Interpreta uma linha da planilha sem fazer I/O, para uso no gerador e testes. */
export function parseRow(
  row: readonly unknown[],
  line: number,
  rowIndex: number,
): ParseRowResult {
  const active = activeState(row[6]);
  if (active === "inactive") {
    return { kind: "inactive" };
  }

  if (active === "invalid") {
    return {
      kind: "rejected",
      warnings: [{ line, message: `ativo invalido: ${String(row[6])}` }],
    };
  }

  const id = textCell(row[0]);
  if (!id) {
    return {
      kind: "rejected",
      warnings: [{ line, message: "id vazio" }],
    };
  }

  const title = textCell(row[2]);
  if (!title) {
    return {
      kind: "rejected",
      warnings: [{ line, message: "titulo vazio" }],
    };
  }

  const price = row[3];
  if (!validPositiveNumber(price)) {
    return {
      kind: "rejected",
      warnings: [{ line, message: "preco ausente, invalido ou nao positivo" }],
    };
  }

  const rawBrand = textCell(row[1]);
  const normalizedBrand = normalizeCatalogText(rawBrand);
  const brandRank = CATALOG_BRANDS.findIndex(
    (brand) => normalizeCatalogText(brand) === normalizedBrand,
  );

  if (brandRank === -1) {
    return {
      kind: "rejected",
      warnings: [
        { line, message: `marca desconhecida: ${rawBrand || "(vazia)"}` },
      ],
    };
  }

  const brand = CATALOG_BRANDS[brandRank];
  const warnings: CatalogWarning[] = [];

  if (brand !== rawBrand) {
    warnings.push({ line, message: `marca canonicalizada: ${brand}` });
  }

  const product: Product = { id, brand, title, price };
  const promoPrice = row[4];

  if (promoPrice !== undefined && promoPrice !== "") {
    if (validPositiveNumber(promoPrice) && promoPrice < price) {
      product.promoPrice = promoPrice;
    } else {
      warnings.push({ line, message: "preco promocional descartado" });
    }
  }

  const imageUrl = textCell(row[5]);
  if (imageUrl) {
    product.imageUrl = imageUrl;
  }

  if (isTrue(row[8])) {
    product.featured = true;
  }

  return {
    kind: "accepted",
    value: {
      product,
      brandRank,
      order: optionalOrder(row[7]),
      rowIndex,
    },
    warnings,
  };
}

export function sortProducts(products: readonly AcceptedProduct[]): Product[] {
  return [...products]
    .sort((left, right) => {
      if (left.brandRank !== right.brandRank) {
        return left.brandRank - right.brandRank;
      }

      if (left.order === undefined && right.order !== undefined) {
        return 1;
      }

      if (left.order !== undefined && right.order === undefined) {
        return -1;
      }

      if (
        left.order !== undefined &&
        right.order !== undefined &&
        left.order !== right.order
      ) {
        return left.order - right.order;
      }

      return left.rowIndex - right.rowIndex;
    })
    .map(({ product }) => product);
}

export function serializeProducts(products: readonly Product[]): string {
  const stableProducts = products.map((product) => {
    const stableProduct: Product = {
      id: product.id,
      brand: product.brand,
      title: product.title,
      price: product.price,
    };

    if (product.promoPrice !== undefined) {
      stableProduct.promoPrice = product.promoPrice;
    }

    if (product.imageUrl !== undefined) {
      stableProduct.imageUrl = product.imageUrl;
    }

    if (product.featured !== undefined) {
      stableProduct.featured = product.featured;
    }

    return stableProduct;
  });

  return [
    "// GERADO POR scripts/build-data.ts — NÃO EDITE À MÃO",
    "",
    'import type { Product } from "../types/product.type";',
    "",
    `export const PRODUCTS: Product[] = ${JSON.stringify(stableProducts, null, 2)};`,
    "",
  ].join("\n");
}
