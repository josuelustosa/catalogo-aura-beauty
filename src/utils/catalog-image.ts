import type { CatalogImage } from "../types/catalog-image.type";

export type ImageFormat = "avif" | "webp";

export const IMAGE_FORMATS: readonly ImageFormat[] = ["avif", "webp"];

/**
 * Descreve a grade real do CatalogGrid; `100vw` mandaria o 960 para o celular.
 * O preload do LCP usa o mesmo valor, senão o navegador baixa a foto duas vezes.
 */
export const IMAGE_SIZES =
  "(min-width: 1024px) 292px, (min-width: 768px) 45vw, 92vw";

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

/** Lado da maior variante: é a dimensão intrínseca, porque tudo é quadrado. */
export function imageSize(image: CatalogImage): number {
  return image.widths[image.widths.length - 1];
}

export function imageSrcSet(image: CatalogImage, format: ImageFormat): string {
  return image.widths
    .map((width) => `${imagePath(image, width, format)} ${width}w`)
    .join(", ");
}
