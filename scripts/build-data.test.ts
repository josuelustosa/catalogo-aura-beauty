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
