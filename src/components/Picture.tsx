import type { CatalogImage } from "../types/catalog-image.type";
import { imagePath, imageSize, imageSrcSet } from "../utils/catalog-image";

/** Descreve a grade real do CatalogGrid; `100vw` mandaria o 960 para o celular. */
const SIZES = "(min-width: 1024px) 292px, (min-width: 768px) 45vw, 92vw";

type PictureProps = {
  image: CatalogImage;
  alt: string;
  /** Primeiros cards da grade: carregam antes do resto. */
  priority?: boolean;
  className?: string;
};

function Picture({ image, alt, priority = false, className }: PictureProps) {
  const size = imageSize(image);

  return (
    <picture>
      <source
        type="image/avif"
        srcSet={imageSrcSet(image, "avif")}
        sizes={SIZES}
      />
      <source
        type="image/webp"
        srcSet={imageSrcSet(image, "webp")}
        sizes={SIZES}
      />
      <img
        src={imagePath(image, size, "webp")}
        alt={alt}
        width={size}
        height={size}
        loading={priority ? "eager" : "lazy"}
        decoding={priority ? "sync" : "async"}
        fetchPriority={priority ? "high" : undefined}
        className={className}
      />
    </picture>
  );
}

export default Picture;
