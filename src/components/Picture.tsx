import type { CatalogImage } from "../types/catalog-image.type";
import {
  IMAGE_SIZES,
  imagePath,
  imageSize,
  imageSrcSet,
} from "../utils/catalog-image";

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
        sizes={IMAGE_SIZES}
      />
      <source
        type="image/webp"
        srcSet={imageSrcSet(image, "webp")}
        sizes={IMAGE_SIZES}
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
