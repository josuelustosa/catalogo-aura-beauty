import { describe, expect, it, vi } from "vitest";
import { CATALOG_BRANDS, EXPECTED_HEADERS } from "./catalog-data.ts";
import { buildCatalog, CatalogBuildError, run } from "./build-data.ts";

const validRow = (id = "BOT-001"): unknown[] => [
  id,
  "Boticário",
  "Produto de teste",
  100,
  80,
  "",
  true,
  1,
  false,
  "",
];

const blankRow = (): unknown[] => ["", "", "", "", "", "", false, "", false];

const blankRows = (count: number): unknown[][] =>
  Array.from({ length: count }, blankRow);

function response(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}

function sheetsFetcher(
  productRows: readonly (readonly unknown[])[],
  brandRows: readonly (readonly unknown[])[] = CATALOG_BRANDS.map((brand) => [
    brand,
  ]),
) {
  return vi.fn(async (url: URL) =>
    decodeURIComponent(url.pathname).endsWith("_marcas!A:A")
      ? response({ values: brandRows })
      : response({ values: productRows }),
  );
}

const credentials = {
  GOOGLE_SHEETS_ID: "spreadsheet-id",
  GOOGLE_SHEETS_API_KEY: "secret",
  CATALOG_SHEET_TAB: "produtos",
};

describe("buildCatalog", () => {
  it("usa fallback sem credenciais e o proibe na Vercel", async () => {
    await expect(buildCatalog({ env: {} })).resolves.toMatchObject({
      usedFallback: true,
      rejected: 0,
    });
    await expect(buildCatalog({ env: { VERCEL: "1" } })).rejects.toBeInstanceOf(
      CatalogBuildError,
    );
    await expect(
      buildCatalog({ env: { GOOGLE_SHEETS_ID: "id" } }),
    ).rejects.toBeInstanceOf(CatalogBuildError);
  });

  it("faz as duas leituras com UNFORMATTED_VALUE", async () => {
    const fetcher = sheetsFetcher([EXPECTED_HEADERS, validRow()]);
    const result = await buildCatalog({ env: credentials, fetcher });

    expect(result.products).toHaveLength(1);
    expect(fetcher).toHaveBeenCalledTimes(2);
    for (const [url] of fetcher.mock.calls) {
      expect(url.searchParams.get("valueRenderOption")).toBe(
        "UNFORMATTED_VALUE",
      );
      expect(url.searchParams.get("key")).toBe("secret");
    }
  });

  it.each([
    ["producao", { VERCEL_ENV: "production" }, "produtos"],
    ["preview", { VERCEL_ENV: "preview" }, "produtos_preview"],
    ["ambiente local", {}, "produtos_preview"],
    [
      "variavel vazia em producao",
      { VERCEL_ENV: "production", CATALOG_SHEET_TAB: "" },
      "produtos",
    ],
    [
      "variavel so com espacos",
      { CATALOG_SHEET_TAB: "  " },
      "produtos_preview",
    ],
    [
      "variavel explicita",
      { VERCEL_ENV: "preview", CATALOG_SHEET_TAB: " produtos " },
      "produtos",
    ],
  ])("le a aba certa em %s", async (_description, env, tab) => {
    const fetcher = sheetsFetcher([EXPECTED_HEADERS, validRow()]);
    await buildCatalog({
      env: { GOOGLE_SHEETS_ID: "id", GOOGLE_SHEETS_API_KEY: "key", ...env },
      fetcher,
    });

    expect(
      fetcher.mock.calls.map(([url]) => decodeURIComponent(url.pathname)),
    ).toContain(`/v4/spreadsheets/id/values/${tab}!A:J`);
  });

  it.each([
    ["HTTP nao-2xx", () => vi.fn(async () => response({}, 403))],
    [
      "corpo nao-JSON",
      () =>
        vi.fn(async () => ({
          ok: true,
          status: 200,
          json: async () => {
            throw new Error("nao-json");
          },
        })),
    ],
    ["cabecalho incorreto", () => sheetsFetcher([["id"], validRow()])],
    ["sem dados", () => sheetsFetcher([EXPECTED_HEADERS])],
    [
      "marcas divergentes",
      () => sheetsFetcher([EXPECTED_HEADERS, validRow()], [["Outra"]]),
    ],
    [
      "id duplicado",
      () => sheetsFetcher([EXPECTED_HEADERS, validRow(), validRow()]),
    ],
  ])("falha para %s", async (_description, createFetcher) => {
    await expect(
      buildCatalog({ env: credentials, fetcher: createFetcher() }),
    ).rejects.toBeInstanceOf(CatalogBuildError);
  });

  it("trata a aba so com caixas de selecao como vazia", async () => {
    await expect(
      buildCatalog({
        env: credentials,
        fetcher: sheetsFetcher([EXPECTED_HEADERS, ...blankRows(999)]),
      }),
    ).rejects.toThrow("nao contem linhas de dados");
  });

  it("trata o intervalo sem valores como aba vazia", async () => {
    await expect(
      buildCatalog({
        env: credentials,
        fetcher: vi.fn(async () => response({ range: "produtos!A1:J1000" })),
      }),
    ).rejects.toThrow("cabecalho");
  });

  it("nao deixa as linhas vazias diluirem o disjuntor", async () => {
    const textPrices = Array.from({ length: 30 }, (_, index) =>
      validRow(`BOT-${String(index + 1).padStart(3, "0")}`).map(
        (value, column) => (column === 3 ? "189,50" : value),
      ),
    );

    await expect(
      buildCatalog({
        env: credentials,
        fetcher: sheetsFetcher([
          EXPECTED_HEADERS,
          ...textPrices,
          ...blankRows(969),
        ]),
      }),
    ).rejects.toThrow("disjuntor");
  });

  it("preserva o numero da linha com linhas vazias intercaladas", async () => {
    await expect(
      buildCatalog({
        env: credentials,
        fetcher: sheetsFetcher([
          EXPECTED_HEADERS,
          blankRow(),
          validRow(),
          blankRow(),
          validRow(),
        ]),
      }),
    ).rejects.toThrow("linhas 3 e 5");

    const result = await buildCatalog({
      env: credentials,
      fetcher: sheetsFetcher([
        EXPECTED_HEADERS,
        blankRow(),
        validRow("BOT-001"),
        [],
        validRow("BOT-002").map((value, column) =>
          column === 4 ? 200 : value,
        ),
      ]),
    });

    expect(result.products).toHaveLength(2);
    expect(result.warnings).toEqual([
      { line: 5, message: "preco promocional descartado" },
    ]);
  });

  it("aceita exatamente 20% de rejeicoes e falha acima disso", async () => {
    const oneInvalid = [
      EXPECTED_HEADERS,
      validRow("BOT-001"),
      validRow("BOT-002"),
      validRow("BOT-003"),
      validRow("BOT-004"),
      validRow("BOT-005").map((value, index) => (index === 3 ? 0 : value)),
    ];
    await expect(
      buildCatalog({ env: credentials, fetcher: sheetsFetcher(oneInvalid) }),
    ).resolves.toMatchObject({ rejected: 1 });

    const twoInvalid = [
      ...oneInvalid,
      validRow("BOT-006").map((value, index) => (index === 3 ? 0 : value)),
    ];
    await expect(
      buildCatalog({ env: credentials, fetcher: sheetsFetcher(twoInvalid) }),
    ).rejects.toThrow("disjuntor");
  });

  it("nao deixa as linhas inativas diluirem o disjuntor", async () => {
    const inactiveRows = Array.from({ length: 100 }, (_, index) =>
      validRow(`INA-${String(index + 1).padStart(3, "0")}`).map(
        (value, column) => (column === 6 ? false : value),
      ),
    );
    const textPrices = Array.from({ length: 20 }, (_, index) =>
      validRow(`BOT-${String(index + 1).padStart(3, "0")}`).map(
        (value, column) => (column === 3 ? "189,50" : value),
      ),
    );

    await expect(
      buildCatalog({
        env: credentials,
        fetcher: sheetsFetcher([
          EXPECTED_HEADERS,
          ...inactiveRows,
          ...textPrices,
        ]),
      }),
    ).rejects.toThrow("disjuntor acionado: 20/20");
  });

  it("aceita catalogo vazio quando todas as linhas estao inativas", async () => {
    const inactive = (id: string) =>
      validRow(id).map((value, column) => (column === 6 ? false : value));

    await expect(
      buildCatalog({
        env: credentials,
        fetcher: sheetsFetcher([
          EXPECTED_HEADERS,
          inactive("BOT-001"),
          inactive("BOT-002"),
        ]),
      }),
    ).resolves.toMatchObject({ products: [], rejected: 0, inactive: 2 });
  });

  it("emite o resumo final greppavel", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const warning = vi
      .spyOn(console, "warn")
      .mockImplementation(() => undefined);

    await run({ forceFallback: true });

    expect(info).toHaveBeenCalledWith("[catalogo] produtos=30 ignorados=0");
    info.mockRestore();
    warning.mockRestore();
  });
});
