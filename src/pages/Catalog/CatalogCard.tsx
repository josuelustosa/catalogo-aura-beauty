import type { Product } from "../../types/product.type";
import { formatPrice } from "../../utils/format-price";
import { buildWhatsAppLink } from "../../utils/whatsapp";

type CatalogCardProps = {
  product: Product;
};

function CatalogCard({ product }: CatalogCardProps) {
  const hasPromo = product.promoPrice !== undefined;
  const displayPrice = product.promoPrice ?? product.price;

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
      <div className="aspect-square w-full bg-surface-soft" />

      <div className="flex flex-1 flex-col gap-1 p-4">
        <p className="text-xs uppercase tracking-wide text-text-secondary">
          {product.brand}
        </p>
        <h3 className="text-lg font-bold text-text">{product.title}</h3>

        <div className="mt-auto pt-2">
          {hasPromo ? (
            <p className="text-xs text-text-secondary line-through">
              {formatPrice(product.price)}
            </p>
          ) : null}

          <p className="text-base font-semibold text-text-brand">
            {formatPrice(displayPrice)}
          </p>
        </div>

        <a
          href={buildWhatsAppLink(product.title)}
          target="_blank"
          rel="noreferrer"
          className="mt-3 flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-text-inverse transition-all hover:bg-primary-hover active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="h-4 w-4"
          >
            <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91A9.85 9.85 0 0 0 19.05 4.9A9.85 9.85 0 0 0 12.04 2Zm0 1.67c2.2 0 4.27.86 5.83 2.42a8.2 8.2 0 0 1 2.41 5.82c0 4.54-3.7 8.24-8.25 8.24a8.24 8.24 0 0 1-4.2-1.15l-.3-.18l-3.11.82l.83-3.04l-.19-.31a8.19 8.19 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24Zm-4.5 4.4c-.21 0-.55.08-.84.39c-.29.31-1.1 1.07-1.1 2.62c0 1.54 1.13 3.03 1.29 3.24c.16.21 2.19 3.5 5.31 4.77c2.6 1.05 3.13.84 3.69.79c.56-.05 1.81-.74 2.07-1.46c.26-.72.26-1.33.18-1.46c-.08-.13-.29-.21-.6-.36c-.31-.16-1.81-.9-2.09-1c-.28-.1-.49-.16-.7.16c-.21.31-.81 1.02-.99 1.23c-.18.21-.37.23-.68.08c-.31-.16-1.31-.49-2.5-1.55c-.92-.82-1.55-1.84-1.73-2.15c-.18-.31-.02-.48.13-.64c.14-.14.31-.36.47-.55c.16-.18.21-.31.31-.52c.1-.21.05-.39-.03-.55c-.08-.16-.7-1.69-.96-2.31c-.24-.58-.48-.59-.68-.6l-.55-.01Z" />
          </svg>
          Comprar agora
        </a>
      </div>
    </article>
  );
}

export default CatalogCard;
