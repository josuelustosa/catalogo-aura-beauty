import { mkdir, mkdtemp, readdir, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import {
  buildImages,
  syncOutput,
  type ImageFetcher,
  type ImageResponse,
} from "./build-images.ts";
import { serializeImages } from "./catalog-images.ts";

const URL_A = "https://cdn.exemplo.com/a.png";
const URL_B = "https://cdn.exemplo.com/b.png";

let png: Buffer;
beforeAll(async () => {
  png = await sharp({
    create: { width: 64, height: 48, channels: 3, background: "#854742" },
  })
    .png()
    .toBuffer();
});

const dirs: string[] = [];
async function tempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "catalogo-imagens-"));
  dirs.push(dir);
  return dir;
}
afterEach(async () => {
  await Promise.all(
    dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
  );
});

function imageResponse(
  body: Buffer | string,
  status = 200,
  headers: Record<string, string> = {},
): ImageResponse {
  const bytes = typeof body === "string" ? Buffer.from(body) : body;
  const lowered = Object.fromEntries(
    Object.entries(headers).map(([name, value]) => [name.toLowerCase(), value]),
  );
  return {
    status,
    headers: { get: (name) => lowered[name.toLowerCase()] ?? null },
    arrayBuffer: async () => Uint8Array.from(bytes).buffer,
  };
}

const pngResponse = (headers: Record<string, string> = {}) =>
  imageResponse(png, 200, { "content-type": "image/png", ...headers });

const entry = (id: string, imageUrl?: string, line = 2) => ({
  id,
  title: `Produto ${id}`,
  line,
  imageUrl,
});

const widthOf = (name: string) => Number(name.split("-")[2].split(".")[0]);

describe("buildImages", () => {
  it("codifica as larguras efetivas nos dois formatos e indexa pelo id", async () => {
    const fetcher = vi.fn<ImageFetcher>(async () => pngResponse());
    const result = await buildImages([entry("TST-001", URL_A)], {
      fetcher,
      cacheDir: await tempDir(),
      widths: [32, 64],
    });

    expect(result.counts).toEqual({ ok: 1, cache: 0, failed: 0, missing: 0 });
    expect(result.warnings).toEqual([]);

    const image = result.images["TST-001"];
    expect(image).toMatchObject({ slug: "tst-001", widths: [32, 48] });
    expect(image?.hash).toMatch(/^[0-9a-f]{8}$/);
    expect([...result.files.keys()].sort()).toEqual([
      `tst-001-32.${image?.hash}.avif`,
      `tst-001-32.${image?.hash}.webp`,
      `tst-001-48.${image?.hash}.avif`,
      `tst-001-48.${image?.hash}.webp`,
    ]);

    for (const [name, file] of result.files) {
      const metadata = await sharp(file).metadata();
      expect([metadata.width, metadata.height]).toEqual([
        widthOf(name),
        widthOf(name),
      ]);
      expect(metadata.format).toBe(name.endsWith(".avif") ? "heif" : "webp");
    }
  });

  it("manda condicional quando ha validador e usa o cache no 304", async () => {
    const cacheDir = await tempDir();
    const validators = {
      etag: '"v1"',
      "last-modified": "Wed, 30 Sep 2026 21:39:11 GMT",
    };
    const first = vi.fn<ImageFetcher>(async () => pngResponse(validators));
    const run1 = await buildImages([entry("TST-001", URL_A)], {
      fetcher: first,
      cacheDir,
      widths: [32],
    });
    expect(first.mock.calls[0][1].headers).toEqual({});

    const second = vi.fn<ImageFetcher>(async () => imageResponse("", 304));
    const run2 = await buildImages([entry("TST-001", URL_A)], {
      fetcher: second,
      cacheDir,
      widths: [32],
    });
    expect(second.mock.calls[0][1].headers).toEqual({
      "If-None-Match": '"v1"',
      "If-Modified-Since": validators["last-modified"],
    });
    expect(run2.images).toEqual(run1.images);
    expect(run2.counts).toEqual({ ok: 1, cache: 0, failed: 0, missing: 0 });
  });

  it("refaz sem condicional quando os bytes do cache sumiram", async () => {
    const cacheDir = await tempDir();
    await buildImages([entry("TST-001", URL_A)], {
      fetcher: vi.fn<ImageFetcher>(async () => pngResponse({ etag: '"v1"' })),
      cacheDir,
      widths: [32],
    });
    const originals = path.join(cacheDir, "originals");
    for (const file of await readdir(originals)) {
      if (file.endsWith(".bin")) {
        await rm(path.join(originals, file));
      }
    }

    const fetcher = vi.fn<ImageFetcher>(async () =>
      pngResponse({ etag: '"v1"' }),
    );
    const result = await buildImages([entry("TST-001", URL_A)], {
      fetcher,
      cacheDir,
      widths: [32],
    });
    expect(fetcher.mock.calls[0][1].headers).toEqual({});
    expect(result.counts.ok).toBe(1);
  });

  it("nao recodifica quando o original nao mudou, mesmo sem validador", async () => {
    const cacheDir = await tempDir();
    const fetcher = vi.fn<ImageFetcher>(async () => pngResponse());
    const run1 = await buildImages([entry("TST-001", URL_A)], {
      fetcher,
      cacheDir,
      widths: [32],
    });
    const encoded = [...run1.files.values()][0];
    const before = (await stat(encoded)).mtimeMs;
    await new Promise((resolve) => setTimeout(resolve, 20));

    const run2 = await buildImages([entry("TST-001", URL_A)], {
      fetcher,
      cacheDir,
      widths: [32],
    });
    expect(fetcher.mock.calls[1][1].headers).toEqual({});
    expect((await stat(encoded)).mtimeMs).toBe(before);
    expect(run2.images).toEqual(run1.images);
  });

  it("e deterministico entre execucoes, ordens e diretorios", async () => {
    const fetcher = vi.fn<ImageFetcher>(async () => pngResponse());
    const first = await buildImages([entry("B", URL_A), entry("A", URL_B)], {
      fetcher,
      cacheDir: await tempDir(),
      widths: [32, 64],
    });
    const second = await buildImages([entry("A", URL_B), entry("B", URL_A)], {
      fetcher,
      cacheDir: await tempDir(),
      widths: [32, 64],
    });

    expect(serializeImages(first.images)).toBe(serializeImages(second.images));
    expect([...first.files.keys()].sort()).toEqual(
      [...second.files.keys()].sort(),
    );
  });

  it("falha com linha, id e titulo para HTML 200, 404 e imagem invalida", async () => {
    const fetcher = vi.fn<ImageFetcher>(async (url) => {
      if (url.endsWith("/html")) {
        return imageResponse("<html>permissao</html>", 200, {
          "content-type": "text/html; charset=UTF-8",
        });
      }
      if (url.endsWith("/404")) {
        return imageResponse("{}", 404, { "content-type": "application/json" });
      }
      return imageResponse("nao e imagem", 200, {
        "content-type": "image/jpeg",
      });
    });
    const result = await buildImages(
      [
        entry("C", "https://x.test/bad.jpg", 4),
        entry("A", "https://x.test/html", 2),
        entry("B", "https://x.test/404", 3),
      ],
      { fetcher, cacheDir: await tempDir(), widths: [32] },
    );

    expect(result.counts).toEqual({ ok: 0, cache: 0, failed: 3, missing: 0 });
    expect(result.images).toEqual({});
    expect(result.warnings).toEqual([
      {
        line: 2,
        message:
          "imagem ignorada: content-type text/html (id=A, titulo=Produto A)",
      },
      {
        line: 3,
        message: "imagem ignorada: HTTP 404 (id=B, titulo=Produto B)",
      },
      {
        line: 4,
        message: expect.stringMatching(
          /^imagem ignorada: imagem invalida: .+ \(id=C, titulo=Produto C\)$/,
        ),
      },
    ]);
  });

  it("trata timeout e erro de rede como falha", async () => {
    const fetcher = vi.fn<ImageFetcher>(async (url) => {
      throw url.endsWith("/lento")
        ? new DOMException("abortado", "TimeoutError")
        : new TypeError("fetch failed");
    });
    const result = await buildImages(
      [
        entry("A", "https://x.test/lento", 2),
        entry("B", "https://x.test/x", 3),
      ],
      { fetcher, cacheDir: await tempDir(), widths: [32] },
    );

    expect(result.counts.failed).toBe(2);
    expect(result.warnings.map((warning) => warning.message)).toEqual([
      "imagem ignorada: rede: timeout (id=A, titulo=Produto A)",
      "imagem ignorada: rede: fetch failed (id=B, titulo=Produto B)",
    ]);
  });

  it("conta como sem foto o produto sem origem, sem avisar", async () => {
    const fetcher = vi.fn<ImageFetcher>();
    const result = await buildImages([entry("A")], {
      fetcher,
      cacheDir: await tempDir(),
    });

    expect(result.counts).toEqual({ ok: 0, cache: 0, failed: 0, missing: 1 });
    expect(result.warnings).toEqual([]);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("deriva a URL do Cloudinary e baixa cada URL uma vez", async () => {
    const fetcher = vi.fn<ImageFetcher>(async () => pngResponse());
    const result = await buildImages(
      [entry("BOT-001"), entry("bot-001", URL_A), entry("BOT-002", URL_A)],
      { fetcher, cacheDir: await tempDir(), cloudName: "cloud", widths: [32] },
    );

    expect(fetcher.mock.calls.map(([url]) => url).sort()).toEqual([
      URL_A,
      "https://res.cloudinary.com/cloud/image/upload/BOT-001.jpg",
    ]);
    expect(result.counts.ok).toBe(3);
    expect(result.images["BOT-002"]?.slug).toBe("bot-002");
    expect(result.images["bot-001"]).toEqual(result.images["BOT-001"]);
  });
});

describe("syncOutput", () => {
  it("copia o conjunto novo, mantem o que ja existe e apaga o resto", async () => {
    const outputDir = path.join(await tempDir(), "img");
    const result = await buildImages([entry("A", URL_A)], {
      fetcher: vi.fn<ImageFetcher>(async () => pngResponse()),
      cacheDir: await tempDir(),
      widths: [32],
    });
    await mkdir(outputDir, { recursive: true });
    await writeFile(path.join(outputDir, "velho-32.00000000.webp"), "x");

    await syncOutput(outputDir, result.files);
    const names = [...result.files.keys()].sort();
    expect((await readdir(outputDir)).sort()).toEqual(names);

    const published = path.join(outputDir, names[0]);
    const before = (await stat(published)).mtimeMs;
    await new Promise((resolve) => setTimeout(resolve, 20));
    await syncOutput(outputDir, result.files);
    expect((await stat(published)).mtimeMs).toBe(before);

    await syncOutput(outputDir, new Map());
    expect(await readdir(outputDir)).toEqual([]);
  });
});
