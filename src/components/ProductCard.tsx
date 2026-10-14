import WhatsAppIcon from "./icons/WhatsAppIcon";
import Picture from "./Picture";
import { IMAGES } from "../data/images.generated";
import type { Product } from "../types/product.type";
import { formatPrice } from "../utils/format-price";
import { buildWhatsAppLink } from "../utils/whatsapp";

type ProductCardProps = {
  product: Product;
  priority?: boolean;
  // No catálogo o card fica logo abaixo do <h1>; na Home, sob o <h2> da seção.
  headingLevel?: 2 | 3;
};

function ProductCard({
  product,
  priority = false,
  headingLevel = 3,
}: ProductCardProps) {
  const Heading = `h${headingLevel}` as const;
  const hasPromo = product.promoPrice !== undefined;
  const displayPrice = product.promoPrice ?? product.price;
  const image = product.imageKey ? IMAGES[product.imageKey] : undefined;

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
      <div className="aspect-square w-full bg-surface-soft">
        {image ? (
          <Picture
            image={image}
            alt={product.title}
            priority={priority}
            className="h-full w-full object-cover"
          />
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-1 p-4">
        <p className="truncate text-xs uppercase tracking-wide text-text-secondary">
          {product.brand}
        </p>
        <Heading className="line-clamp-2 h-14 text-lg font-bold text-text">
          {product.title}
        </Heading>

        <div className="mt-auto pt-2">
          {/* A linha existe mesmo sem promoção: os preços ficam alinhados na grade. */}
          <p className="h-4 text-xs text-text-secondary line-through">
            {hasPromo ? formatPrice(product.price) : null}
          </p>

          <p className="text-base font-semibold text-text-brand">
            {formatPrice(displayPrice)}
          </p>
        </div>

        <a
          href={buildWhatsAppLink(product.title)}
          target="_blank"
          rel="noreferrer"
          className="mt-3 flex min-h-11 items-center justify-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-text-inverse transition-all hover:bg-primary-hover active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <WhatsAppIcon />
          Comprar agora
        </a>
      </div>
    </article>
  );
}

export default ProductCard;
