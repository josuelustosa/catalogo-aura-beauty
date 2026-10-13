import { IMAGES } from "../data/images.generated";
import { CATALOG_NAV_ITEMS } from "../mocks/nav-item.mock";
import {
  getCatalogBySlug,
  getFeaturedProducts,
} from "../services/catalog.service";
import type { Product } from "../types/product.type";
import type { PageExpectation } from "./entry-contract";

export const HOME_HEADING = "Perfumaria e beleza à pronta-entrega em Manaus";
export const CATALOG_HOME_HEADING = "Escolha um catálogo";

function withPhoto(products: readonly Product[]): boolean {
  return products.some(
    (product) => product.imageKey && IMAGES[product.imageKey],
  );
}

/** O que o HTML de cada rota precisa conter; a checagem roda no prerender. */
export function describePage(pathname: string): PageExpectation {
  if (pathname === "/") {
    // Os destaques são os únicos produtos da Home.
    const featured = getFeaturedProducts();
    return {
      heading: HOME_HEADING,
      hasProducts: featured.length > 0,
      hasImages: withPhoto(featured),
    };
  }

  if (pathname === "/catalogo") {
    return {
      heading: CATALOG_HOME_HEADING,
      hasProducts: false,
      hasImages: false,
    };
  }

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
    hasImages: withPhoto(products),
  };
}
