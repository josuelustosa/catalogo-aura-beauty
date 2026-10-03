import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ImageFetcher } from "./build-images.ts";
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

    expect(result).toMatchObject({ source: "produtos", usedFallback: false });
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
    ).rejects.toThrow("a aba produtos nao contem linhas de dados");
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

    expect(info).toHaveBeenCalledWith(
      "[catalogo] origem=mock produtos=30 ignorados=0 inativos=0 imagens_ok=0 imagens_cache=0 imagens_falha=0 imagens_sem_foto=0",
    );
    info.mockRestore();
    warning.mockRestore();
  });
});

describe("imagens no catalogo", () => {
  const dirs: string[] = [];
  afterEach(async () => {
    await Promise.all(
      dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
    );
  });

  it("liga o imageKey ao manifesto e mantem o produto sem foto intacto", async () => {
    const cacheDir = await mkdtemp(path.join(os.tmpdir(), "catalogo-"));
    dirs.push(cacheDir);
    const png = await sharp({
      create: { width: 32, height: 32, channels: 3, background: "#fff" },
    })
      .png()
      .toBuffer();
    const imageFetcher = vi.fn<ImageFetcher>(async () => ({
      status: 200,
      headers: {
        get: (name: string) => (name === "content-type" ? "image/png" : null),
      },
      arrayBuffer: async () => Uint8Array.from(png).buffer,
    }));

    const result = await buildCatalog({
      env: { ...credentials, CLOUDINARY_CLOUD_NAME: " cloud " },
      fetcher: sheetsFetcher([
        EXPECTED_HEADERS,
        validRow("BOT-001").map((value, column) =>
          column === 5 ? "https://cdn.exemplo.com/a.png" : value,
        ),
        validRow("BOT-002"),
      ]),
      imageFetcher,
      imagePaths: { cacheDir },
    });

    expect(imageFetcher.mock.calls.map(([url]) => url).sort()).toEqual([
      "https://cdn.exemplo.com/a.png",
      "https://res.cloudinary.com/cloud/image/upload/BOT-002.jpg",
    ]);
    expect(result.products.map((product) => product.imageKey)).toEqual([
      "BOT-001",
      "BOT-002",
    ]);
    expect(Object.keys(result.images).sort()).toEqual(["BOT-001", "BOT-002"]);
    expect(result.imageCounts).toEqual({
      ok: 2,
      cache: 0,
      failed: 0,
      missing: 0,
    });
    expect(result.output).toContain('"imageKey": "BOT-001"');
    expect(result.imagesOutput).toContain('"slug": "bot-002"');
    // Original de 32 px: uma largura efetiva por produto, em dois formatos.
    expect(result.images["BOT-001"]?.widths).toEqual([32]);
    expect(result.imageFiles.size).toBe(4);
  });

  it("sem cloud name e sem coluna, nada e baixado", async () => {
    const imageFetcher = vi.fn();
    const result = await buildCatalog({
      env: credentials,
      fetcher: sheetsFetcher([EXPECTED_HEADERS, validRow()]),
      imageFetcher,
    });

    expect(imageFetcher).not.toHaveBeenCalled();
    expect(result.products[0].imageKey).toBeUndefined();
    expect(result.imageCounts.missing).toBe(1);
    expect(result.imagesOutput).toContain("= {};");
  });
});

describe("disjuntor de imagens", () => {
  const dirs: string[] = [];
  afterEach(async () => {
    await Promise.all(
      dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
    );
  });
  const cacheDir = async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "catalogo-"));
    dirs.push(dir);
    return dir;
  };
  const response = (status: number, contentType: string | null) =>
    vi.fn<ImageFetcher>(async () => ({
      status,
      headers: {
        get: (name) => (name === "content-type" ? contentType : null),
      },
      arrayBuffer: async () => new ArrayBuffer(0),
    }));
  const driveRows = () => [
    EXPECTED_HEADERS,
    ...["BOT-001", "BOT-002", "BOT-003"].map((id) =>
      validRow(id).map((value, column) =>
        column === 5 ? `https://drive.google.com/file/d/${id}/view` : value,
      ),
    ),
  ];

  it("falha o build fora do preview e vira aviso com ALLOW_STALE_CATALOG=1", async () => {
    await expect(
      buildCatalog({
        env: credentials,
        fetcher: sheetsFetcher(driveRows()),
        imageFetcher: response(200, "text/html"),
        imagePaths: { cacheDir: await cacheDir() },
      }),
    ).rejects.toThrow("disjuntor de imagens acionado: 3/3");

    const degraded = await buildCatalog({
      env: {
        ...credentials,
        ALLOW_STALE_CATALOG: "1",
        VERCEL: "1",
        VERCEL_ENV: "preview",
      },
      fetcher: sheetsFetcher(driveRows()),
      imageFetcher: response(200, "text/html"),
      imagePaths: { cacheDir: await cacheDir() },
    });
    expect(degraded.usedFallback).toBe(false);
    expect(degraded.products).toHaveLength(3);
    expect(degraded.products.map((product) => product.imageKey)).toEqual([
      undefined,
      undefined,
      undefined,
    ]);
    expect(degraded.staleImagesReason).toContain("permissao da pasta do Drive");
    expect(degraded.warnings).toHaveLength(3);
  });

  it("lista os ids sem foto no Cloudinary", async () => {
    const result = await buildCatalog({
      env: { ...credentials, CLOUDINARY_CLOUD_NAME: "cloud" },
      fetcher: sheetsFetcher([
        EXPECTED_HEADERS,
        validRow("BOT-002"),
        validRow("BOT-001"),
      ]),
      imageFetcher: response(404, "application/json"),
      imagePaths: { cacheDir: await cacheDir() },
    });

    expect(result.missingImageIds).toEqual(["BOT-001", "BOT-002"]);
    expect(result.imageCounts).toEqual({
      ok: 0,
      cache: 0,
      failed: 0,
      missing: 2,
    });
    expect(result.warnings).toEqual([]);
    expect(result.staleImagesReason).toBeUndefined();
  });
});

describe("ALLOW_STALE_CATALOG", () => {
  const preview = {
    ...credentials,
    ALLOW_STALE_CATALOG: "1",
    VERCEL: "1",
    VERCEL_ENV: "preview",
  };
  const failing = () => vi.fn(async () => response({}, 500));

  it("troca a planilha invalida pelo mock em preview", async () => {
    await expect(
      buildCatalog({ env: preview, fetcher: failing() }),
    ).resolves.toMatchObject({
      usedFallback: true,
      source: "mock",
      staleReason: expect.stringContaining("HTTP 500"),
    });

    const brokenPrice = validRow().map((value, column) =>
      column === 3 ? "abc" : value,
    );
    await expect(
      buildCatalog({
        env: preview,
        fetcher: sheetsFetcher([EXPECTED_HEADERS, brokenPrice]),
      }),
    ).resolves.toMatchObject({
      source: "mock",
      staleReason: expect.stringContaining("disjuntor"),
    });
  });

  it.each([
    ["producao", { VERCEL_ENV: "production" }],
    ["ambiente desconhecido", { VERCEL_ENV: undefined }],
    ["variavel diferente de 1", { ALLOW_STALE_CATALOG: "true" }],
  ])("falha em %s", async (_description, override) => {
    await expect(
      buildCatalog({ env: { ...preview, ...override }, fetcher: failing() }),
    ).rejects.toBeInstanceOf(CatalogBuildError);
  });

  it("nao cobre credencial ausente ou parcial", async () => {
    const withoutCredentials = {
      ALLOW_STALE_CATALOG: "1",
      VERCEL: "1",
      VERCEL_ENV: "preview",
    };

    await expect(
      buildCatalog({ env: withoutCredentials }),
    ).rejects.toBeInstanceOf(CatalogBuildError);
    await expect(
      buildCatalog({ env: { ...withoutCredentials, GOOGLE_SHEETS_ID: "id" } }),
    ).rejects.toBeInstanceOf(CatalogBuildError);
  });

  it("avisa no log que usou o mock", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const warning = vi
      .spyOn(console, "warn")
      .mockImplementation(() => undefined);

    await run({ env: preview, fetcher: failing() });

    expect(warning).toHaveBeenCalledWith(
      expect.stringContaining("ALLOW_STALE_CATALOG=1, usando products.mock.ts"),
    );
    expect(info).toHaveBeenCalledWith(
      "[catalogo] origem=mock produtos=30 ignorados=0 inativos=0 imagens_ok=0 imagens_cache=0 imagens_falha=0 imagens_sem_foto=0",
    );
    info.mockRestore();
    warning.mockRestore();
  });
});
