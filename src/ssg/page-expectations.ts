import { IMAGES } from "../data/images.generated";
import { CATALOG_NAV_ITEMS } from "../mocks/nav-item.mock";
import { getCatalogBySlug } from "../services/catalog.service";
import type { PageExpectation } from "./entry-contract";

/** O que o HTML de cada rota precisa conter; a checagem roda no prerender. */
export function describePage(pathname: string): PageExpectation {
  if (pathname === "/404") {
    return {
      heading: "Página não encontrada",
      hasProducts: false,
      hasImages: false,
    };
  }

  const item = CATALOG_NAV_ITEMS.find((entry) => entry.path === pathname);
  if (!item) {
    return { hasProducts: false, hasImages: false };
  }

  const products = getCatalogBySlug(item.slug)?.products ?? [];
  return {
    heading: item.label,
    hasProducts: products.length > 0,
    hasImages: products.some(
      (product) => product.imageKey && IMAGES[product.imageKey],
    ),
  };
}
