import { createHash } from "node:crypto";
import { copyFile, mkdir, readdir, readFile, rm, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import type {
  CatalogImage,
  CatalogImages,
} from "../src/types/catalog-image.type.ts";
import { IMAGE_FORMATS, imageFileName } from "../src/utils/catalog-image.ts";
import { writeFileAtomic } from "./atomic-write.ts";
import type { CatalogWarning } from "./catalog-data.ts";
import {
  effectiveWidths,
  IMAGE_QUALITY,
  IMAGE_WIDTHS,
  imageSlug,
  imageSourceOf,
  isImageContentType,
  parseContentType,
  PIPELINE_VERSION,
} from "./catalog-images.ts";

export type ImageResponse = {
  status: number;
  headers: { get(name: string): string | null };
  arrayBuffer(): Promise<ArrayBuffer>;
};

export type ImageRequest = {
  headers: Record<string, string>;
  signal: AbortSignal;
};

export type ImageFetcher = (
  url: string,
  init: ImageRequest,
) => Promise<ImageResponse>;

export type ImageEntry = {
  id: string;
  title: string;
  line: number;
  imageUrl?: string;
};

export type ImageCounts = {
  ok: number;
  /** Download falhou, mas o original em cache segurou a foto. */
  cache: number;
  failed: number;
  /** Sem origem ou foto ainda não subiu: não é erro. */
  missing: number;
};

export type ImagesOptions = {
  cloudName?: string;
  fetcher?: ImageFetcher;
  cacheDir?: string;
  widths?: readonly number[];
  concurrency?: number;
  timeoutMs?: number;
};

export type ImagesResult = {
  images: CatalogImages;
  warnings: CatalogWarning[];
  counts: ImageCounts;
  /** Nome publicado → arquivo no cache; `syncOutput` leva para public/img. */
  files: ReadonlyMap<string, string>;
};

type Original = {
  bytes: Buffer;
  sha256: string;
  contentType: string;
};

type Sidecar = {
  url: string;
  etag?: string;
  lastModified?: string;
  contentType: string;
  sha256: string;
  size: number;
  fetchedAt: string;
};

type Download =
  | { kind: "ok"; original: Original }
  | { kind: "failed"; reason: string };

const projectRoot = fileURLToPath(new URL("../", import.meta.url));

/** Só node_modules/** sobrevive entre builds na Vercel. */
export const DEFAULT_CACHE_DIR = path.join(
  projectRoot,
  "node_modules/.cache/catalogo-imagens",
);

export const DEFAULT_OUTPUT_DIR = path.join(projectRoot, "public/img");

const defaultFetcher: ImageFetcher = (url, init) => fetch(url, init);

function sha256(data: Buffer | string): string {
  return createHash("sha256").update(data).digest("hex");
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.name === "TimeoutError" ? "timeout" : error.message;
  }

  return String(error);
}

async function hasContent(file: string): Promise<boolean> {
  try {
    return (await stat(file)).size > 0;
  } catch {
    return false;
  }
}

async function mapConcurrent<T>(
  items: readonly T[],
  limit: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  let next = 0;
  const lanes = Array.from(
    { length: Math.min(limit, items.length) },
    async () => {
      while (next < items.length) {
        const item = items[next];
        next += 1;
        await worker(item);
      }
    },
  );

  await Promise.all(lanes);
}

class OriginalsCache {
  private readonly dir: string;

  constructor(dir: string) {
    this.dir = dir;
  }

  private base(url: string): string {
    return path.join(this.dir, sha256(url));
  }

  /** Sidecar sem bytes, ou bytes que não batem com ele, contam como miss. */
  async read(
    url: string,
  ): Promise<{ sidecar: Sidecar; bytes: Buffer } | undefined> {
    try {
      const sidecar = JSON.parse(
        await readFile(`${this.base(url)}.json`, "utf8"),
      ) as Sidecar;
      const bytes = await readFile(`${this.base(url)}.bin`);
      if (sidecar.size !== bytes.length || sidecar.sha256 !== sha256(bytes)) {
        return undefined;
      }

      return { sidecar, bytes };
    } catch {
      return undefined;
    }
  }

  async write(
    url: string,
    original: Original,
    validators: { etag?: string; lastModified?: string },
  ): Promise<void> {
    const sidecar: Sidecar = {
      url,
      ...validators,
      contentType: original.contentType,
      sha256: original.sha256,
      size: original.bytes.length,
      fetchedAt: new Date().toISOString(),
    };

    await writeFileAtomic(`${this.base(url)}.bin`, original.bytes);
    await writeFileAtomic(`${this.base(url)}.json`, JSON.stringify(sidecar));
  }
}

async function download(
  url: string,
  cache: OriginalsCache,
  fetcher: ImageFetcher,
  timeoutMs: number,
): Promise<Download> {
  const cached = await cache.read(url);
  const headers: Record<string, string> = {};
  if (cached?.sidecar.etag) {
    headers["If-None-Match"] = cached.sidecar.etag;
  }
  if (cached?.sidecar.lastModified) {
    headers["If-Modified-Since"] = cached.sidecar.lastModified;
  }

  let response: ImageResponse;
  try {
    response = await fetcher(url, {
      headers,
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    return { kind: "failed", reason: `rede: ${errorMessage(error)}` };
  }

  if (response.status === 304 && cached) {
    return {
      kind: "ok",
      original: {
        bytes: cached.bytes,
        sha256: cached.sidecar.sha256,
        contentType: cached.sidecar.contentType,
      },
    };
  }

  if (response.status < 200 || response.status >= 300) {
    return { kind: "failed", reason: `HTTP ${response.status}` };
  }

  // O Drive responde "sem permissão" com 200 e HTML; o status não basta.
  const contentType = response.headers.get("content-type");
  if (!isImageContentType(contentType)) {
    return {
      kind: "failed",
      reason: `content-type ${parseContentType(contentType) || "ausente"}`,
    };
  }

  let bytes: Buffer;
  try {
    bytes = Buffer.from(await response.arrayBuffer());
  } catch (error) {
    return { kind: "failed", reason: `rede: ${errorMessage(error)}` };
  }

  if (bytes.length === 0) {
    return { kind: "failed", reason: "corpo vazio" };
  }

  const original: Original = {
    bytes,
    sha256: sha256(bytes),
    contentType: parseContentType(contentType),
  };
  await cache.write(url, original, {
    etag: response.headers.get("etag") ?? undefined,
    lastModified: response.headers.get("last-modified") ?? undefined,
  });

  return { kind: "ok", original };
}

/** Recorta uma vez no maior tamanho e reduz a partir dele: mesmo enquadramento em todas as larguras. */
async function encode(
  original: Original,
  slug: string,
  widths: readonly number[],
  encodedDir: string,
): Promise<{ image: CatalogImage; files: Map<string, string> }> {
  const hash = sha256(
    `${original.sha256}|${PIPELINE_VERSION}|${sharp.versions.vips}`,
  ).slice(0, 8);
  const source = sharp(original.bytes, { autoOrient: true, failOn: "error" });
  const metadata = await source.metadata();
  const sizes = effectiveWidths(
    Math.min(metadata.width, metadata.height),
    widths,
  );
  const image: CatalogImage = { slug, hash, widths: sizes };

  const files = new Map<string, string>();
  const pending: { width: number; format: "avif" | "webp"; file: string }[] =
    [];
  for (const width of sizes) {
    for (const format of IMAGE_FORMATS) {
      const name = imageFileName(image, width, format);
      const file = path.join(encodedDir, name);
      files.set(name, file);
      if (!(await hasContent(file))) {
        pending.push({ width, format, file });
      }
    }
  }

  if (pending.length === 0) {
    return { image, files };
  }

  const master = sizes[sizes.length - 1];
  const { data, info } = await source
    .resize(master, master, {
      fit: "cover",
      position: "attention",
      withoutEnlargement: true,
    })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const raw = {
    width: info.width,
    height: info.height,
    channels: info.channels,
  };

  await mkdir(encodedDir, { recursive: true });
  for (const { width, format, file } of pending) {
    // Sem withMetadata: EXIF (inclusive GPS do celular) fica de fora.
    const variant = sharp(data, { raw }).resize(width, width);
    const encoded =
      format === "avif"
        ? await variant.avif({ quality: IMAGE_QUALITY.avif }).toBuffer()
        : await variant.webp({ quality: IMAGE_QUALITY.webp }).toBuffer();
    await writeFileAtomic(file, encoded);
  }

  return { image, files };
}

export async function buildImages(
  entries: readonly ImageEntry[],
  options: ImagesOptions = {},
): Promise<ImagesResult> {
  const cacheDir = options.cacheDir ?? DEFAULT_CACHE_DIR;
  const fetcher = options.fetcher ?? defaultFetcher;
  const widths = options.widths ?? IMAGE_WIDTHS;
  const timeoutMs = options.timeoutMs ?? 30_000;
  const cache = new OriginalsCache(path.join(cacheDir, "originals"));
  const encodedDir = path.join(cacheDir, "encoded");

  // 4 pipelines em paralelo; cada uma com 1 thread para não passar das 4 vCPUs.
  sharp.concurrency(1);
  sharp.cache(false);

  const images: Record<string, CatalogImage> = {};
  const warnings: CatalogWarning[] = [];
  const counts: ImageCounts = { ok: 0, cache: 0, failed: 0, missing: 0 };
  const files = new Map<string, string>();
  const downloads = new Map<string, Promise<Download>>();

  const downloadOnce = (url: string): Promise<Download> => {
    let pending = downloads.get(url);
    if (!pending) {
      pending = download(url, cache, fetcher, timeoutMs);
      downloads.set(url, pending);
    }

    return pending;
  };

  const fail = (entry: ImageEntry, reason: string): void => {
    counts.failed += 1;
    warnings.push({
      line: entry.line,
      message: `imagem ignorada: ${reason} (id=${entry.id}, titulo=${entry.title})`,
    });
  };

  await mapConcurrent(entries, options.concurrency ?? 4, async (entry) => {
    const source = imageSourceOf(entry, options.cloudName);
    if (!source) {
      counts.missing += 1;
      return;
    }

    if (source.kind === "invalid") {
      fail(entry, source.reason);
      return;
    }

    const downloaded = await downloadOnce(source.url);
    if (downloaded.kind === "failed") {
      fail(entry, downloaded.reason);
      return;
    }

    try {
      const encoded = await encode(
        downloaded.original,
        imageSlug(entry.id),
        widths,
        encodedDir,
      );
      images[entry.id] = encoded.image;
      for (const [name, file] of encoded.files) {
        files.set(name, file);
      }
      counts.ok += 1;
    } catch (error) {
      fail(entry, `imagem invalida: ${errorMessage(error)}`);
    }
  });

  warnings.sort((left, right) => left.line - right.line);

  return { images, warnings, counts, files };
}

/** Copia o conjunto novo e apaga o resto, nessa ordem: nunca há janela vazia. */
export async function syncOutput(
  outputDir: string,
  files: ReadonlyMap<string, string>,
): Promise<void> {
  await mkdir(outputDir, { recursive: true });

  for (const [name, source] of files) {
    const target = path.join(outputDir, name);
    if (!(await hasContent(target))) {
      await copyFile(source, target);
    }
  }

  for (const existing of await readdir(outputDir)) {
    if (!files.has(existing)) {
      await rm(path.join(outputDir, existing), { force: true });
    }
  }
}
