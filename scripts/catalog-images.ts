import type {
  CatalogImage,
  CatalogImages,
} from "../src/types/catalog-image.type.ts";
import { normalizeCatalogText } from "../src/utils/normalize-catalog-text.ts";

/** Cobrem 1×, 2× e 3× do maior card (~292 px) em todos os breakpoints. */
export const IMAGE_WIDTHS: readonly number[] = [320, 480, 640, 960];

export const IMAGE_QUALITY = { avif: 50, webp: 78 } as const;

/** Entra no hash dos arquivos: mudar um parâmetro renomeia toda a saída. */
export const PIPELINE_VERSION = `1|cover-attention|avif${IMAGE_QUALITY.avif}|webp${IMAGE_QUALITY.webp}`;

export type ImageHost = "drive" | "cloudinary" | "other";

export type ImageSource =
  | {
      kind: "source";
      url: string;
      /** `derived` = montada do id; 404 nela significa "foto ainda não subiu". */
      origin: "column" | "derived";
      host: ImageHost;
    }
  | { kind: "invalid"; reason: string };

const DRIVE_HOSTS = new Set(["drive.google.com", "docs.google.com"]);
const DRIVE_ID_ENDPOINTS = new Set(["/open", "/uc", "/thumbnail"]);
const DRIVE_ID = /^[\w-]+$/;

function driveFileId(url: URL): string | undefined {
  const inPath = /^\/file\/d\/([\w-]+)/.exec(url.pathname);
  if (inPath) {
    return inPath[1];
  }

  const inQuery = url.searchParams.get("id");
  if (
    inQuery &&
    DRIVE_ID.test(inQuery) &&
    DRIVE_ID_ENDPOINTS.has(url.pathname)
  ) {
    return inQuery;
  }

  return undefined;
}

/** O endpoint de thumbnail devolve a imagem direto, sem interstício. */
export function driveThumbnailUrl(fileId: string): string {
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w2000`;
}

export function cloudinaryUrl(cloudName: string, id: string): string {
  return `https://res.cloudinary.com/${encodeURIComponent(cloudName)}/image/upload/${encodeURIComponent(id)}.jpg`;
}

/** A coluna tem precedência; sem ela, a URL vem do id quando há cloud name. */
export function imageSourceOf(
  entry: { id: string; imageUrl?: string },
  cloudName: string | undefined,
): ImageSource | undefined {
  if (entry.imageUrl) {
    return columnSource(entry.imageUrl);
  }

  if (cloudName) {
    return {
      kind: "source",
      url: cloudinaryUrl(cloudName, entry.id),
      origin: "derived",
      host: "cloudinary",
    };
  }

  return undefined;
}

function columnSource(raw: string): ImageSource {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { kind: "invalid", reason: "imagem_url nao e um link" };
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return { kind: "invalid", reason: "imagem_url nao e um link http(s)" };
  }

  if (DRIVE_HOSTS.has(url.hostname)) {
    const fileId = driveFileId(url);
    if (!fileId) {
      return {
        kind: "invalid",
        reason: "link do Drive nao aponta para um arquivo",
      };
    }

    return {
      kind: "source",
      url: driveThumbnailUrl(fileId),
      origin: "column",
      host: "drive",
    };
  }

  return {
    kind: "source",
    url: url.href,
    origin: "column",
    host: url.hostname === "res.cloudinary.com" ? "cloudinary" : "other",
  };
}

export function imageSlug(id: string): string {
  const slug = normalizeCatalogText(id)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "produto";
}

/** Nunca amplia: original de 500 px vira [320, 480, 500]. */
export function effectiveWidths(
  size: number,
  widths: readonly number[] = IMAGE_WIDTHS,
): number[] {
  return [...new Set(widths.map((width) => Math.min(width, size)))].sort(
    (left, right) => left - right,
  );
}

export function parseContentType(value: string | null | undefined): string {
  return (value ?? "").split(";")[0].trim().toLowerCase();
}

export function isImageContentType(value: string | null | undefined): boolean {
  return parseContentType(value).startsWith("image/");
}

export function serializeImages(images: CatalogImages): string {
  const stableImages: Record<string, CatalogImage> = {};

  for (const key of Object.keys(images).sort()) {
    const image = images[key];
    if (image) {
      stableImages[key] = {
        slug: image.slug,
        hash: image.hash,
        widths: [...image.widths],
      };
    }
  }

  return [
    "// GERADO POR scripts/build-data.ts — NÃO EDITE À MÃO",
    "",
    'import type { CatalogImages } from "../types/catalog-image.type";',
    "",
    `export const IMAGES: CatalogImages = ${JSON.stringify(stableImages, null, 2)};`,
    "",
  ].join("\n");
}

export const MAX_IMAGE_BYTES = 25 * 1024 * 1024;

export type ImageCounts = {
  ok: number;
  /** Download falhou, mas o original em cache segurou a foto. */
  cache: number;
  failed: number;
  /** Sem origem ou foto ainda não subiu: não é erro. */
  missing: number;
};

/** Mais da metade e pelo menos 3: um link ruim sozinho não derruba o deploy. */
export function shouldTripBreaker({ ok, cache, failed }: ImageCounts): boolean {
  const broken = cache + failed;
  return broken >= 3 && broken > ok;
}

export function breakerMessage(
  counts: ImageCounts,
  failedHosts: readonly ImageHost[],
): string {
  const broken = counts.cache + counts.failed;
  const drive = failedHosts.filter((host) => host === "drive").length;
  const cause =
    drive * 2 > failedHosts.length
      ? "permissao da pasta do Drive (compartilhe como 'qualquer pessoa com o link')"
      : "fotos removidas ou origem fora do ar";

  return `disjuntor de imagens acionado: ${broken}/${broken + counts.ok} falharam; causa provavel: ${cause}`;
}
