import { IMAGES } from "../data/images.generated";
import { CATALOG_NAV_ITEMS } from "../mocks/nav-item.mock";
import { getCatalogBySlug } from "../services/catalog.service";
import { imagePath, imageSize } from "../utils/catalog-image";
import { WHATSAPP_NUMBER } from "../utils/whatsapp";

const INSTAGRAM_URL: string = import.meta.env.VITE_INSTAGRAM_URL ?? "";

type Crumb = { name: string; path: string };

function breadcrumbs(siteUrl: string, crumbs: readonly Crumb[]): object {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: `${siteUrl}${crumb.path}`,
    })),
  };
}

function homeJsonLd(siteUrl: string, siteName: string, ogImage: string) {
  const business: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${siteUrl}/#negocio`,
    name: siteName,
    url: `${siteUrl}/`,
    image: ogImage,
    areaServed: { "@type": "City", name: "Manaus" },
    address: {
      "@type": "PostalAddress",
      addressLocality: "Manaus",
      addressRegion: "AM",
      addressCountry: "BR",
    },
  };

  if (WHATSAPP_NUMBER) {
    business.telephone = `+${WHATSAPP_NUMBER}`;
  }
  if (INSTAGRAM_URL) {
    business.sameAs = [INSTAGRAM_URL];
  }

  return [
    business,
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: siteName,
      url: `${siteUrl}/`,
      inLanguage: "pt-BR",
    },
  ];
}

function catalogJsonLd(siteUrl: string, slug: string, label: string) {
  const url = `${siteUrl}/catalogo/${slug}`;
  const products = getCatalogBySlug(slug)?.products ?? [];

  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: label,
    url,
    inLanguage: "pt-BR",
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: products.length,
      itemListElement: products.map((product, index) => {
        const image = product.imageKey ? IMAGES[product.imageKey] : undefined;
        return {
          "@type": "ListItem",
          position: index + 1,
          item: {
            "@type": "Product",
            name: product.title,
            brand: { "@type": "Brand", name: product.brand },
            ...(image && {
              image: `${siteUrl}${imagePath(image, imageSize(image), "webp")}`,
            }),
            offers: {
              "@type": "Offer",
              price: (product.promoPrice ?? product.price).toFixed(2),
              priceCurrency: "BRL",
              availability: "https://schema.org/InStock",
              url,
            },
          },
        };
      }),
    },
  };
}

/** Sem SearchAction: o Google aposentou o sitelinks search box em 2024. */
export function buildJsonLd(
  pathname: string,
  siteUrl: string,
  siteName: string,
  ogImage: string,
): object[] {
  const home: Crumb = { name: "Início", path: "/" };
  const catalogs: Crumb = { name: "Catálogos", path: "/catalogo" };

  if (pathname === "/") {
    return homeJsonLd(siteUrl, siteName, ogImage);
  }

  if (pathname === "/catalogo") {
    return [breadcrumbs(siteUrl, [home, catalogs])];
  }

  const item = CATALOG_NAV_ITEMS.find((entry) => entry.path === pathname);
  if (!item) {
    return [];
  }

  return [
    catalogJsonLd(siteUrl, item.slug, item.label),
    breadcrumbs(siteUrl, [
      home,
      catalogs,
      { name: item.label, path: item.path },
    ]),
  ];
}

/** `<` vira <: um título de produto não consegue fechar o <script>. */
export function serializeJsonLd(data: object): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
