import type { CatalogImage } from "../types/catalog-image.type";

export type ImageFormat = "avif" | "webp";

export const IMAGE_FORMATS: readonly ImageFormat[] = ["avif", "webp"];

/** Única fonte do esquema de nomes: o build grava e o `<Picture>` lê. */
export function imageFileName(
  image: Pick<CatalogImage, "slug" | "hash">,
  width: number,
  format: ImageFormat,
): string {
  return `${image.slug}-${width}.${image.hash}.${format}`;
}

export function imagePath(
  image: Pick<CatalogImage, "slug" | "hash">,
  width: number,
  format: ImageFormat,
): string {
  return `/img/${imageFileName(image, width, format)}`;
}
