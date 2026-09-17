import { PRODUCTS } from "../data/products.generated";
import { getCatalogNavItemBySlug } from "../mocks/nav-item.mock";
import type { Product } from "../types/product.type";
import { normalizeCatalogText } from "../utils/normalize-catalog-text";

export type CatalogBrandGroup = {
  brand: string;
  products: Product[];
};

export type CatalogView = {
  slug: string;
  title: string;
  brands: readonly string[];
  products: Product[];
};

/**
 * A planilha é editada à mão, então "boticário " e "Boticario" precisam casar.
 */
export function getProductsByBrands(brands: readonly string[]): Product[] {
  const wanted = new Set(brands.map(normalizeCatalogText));

  return PRODUCTS.filter((product) =>
    wanted.has(normalizeCatalogText(product.brand)),
  );
}

/**
 * Busca por título ou marca. Passa pelo mesmo `normalize` do filtro de marca
 * porque o usuário digita sem acento ("boticario") e a planilha tem acento.
 */
export function searchProducts(products: Product[], term: string): Product[] {
  const query = normalizeCatalogText(term);

  if (!query) {
    return products;
  }

  return products.filter(
    (product) =>
      normalizeCatalogText(product.title).includes(query) ||
      normalizeCatalogText(product.brand).includes(query),
  );
}

/** Agrupa por marca preservando a ordem de primeira aparição. */
export function groupByBrand(products: Product[]): CatalogBrandGroup[] {
  const groups: CatalogBrandGroup[] = [];
  const indexByBrand = new Map<string, number>();

  for (const product of products) {
    const key = normalizeCatalogText(product.brand);
    const index = indexByBrand.get(key);

    if (index === undefined) {
      indexByBrand.set(key, groups.length);
      groups.push({ brand: product.brand, products: [product] });
      continue;
    }

    groups[index].products.push(product);
  }

  return groups;
}

/**
 * Orquestra a regra de negócio do catálogo:
 * slug -> item do menu -> marcas do grupo -> produtos daquelas marcas.
 */
export function getCatalogBySlug(slug: string): CatalogView | null {
  const navItem = getCatalogNavItemBySlug(slug);

  if (!navItem) {
    return null;
  }

  return {
    slug: navItem.slug,
    title: navItem.label,
    brands: navItem.brands,
    products: getProductsByBrands(navItem.brands),
  };
}
