import { CATALOG_NAV_ITEMS } from "../mocks/nav-item.mock";

export const SITE_NAME = "Aura Beauty";
export const OG_IMAGE_PATH = "/aura-beauty-open-graph-1200x630.png";

/** Derivado do menu: um catálogo novo vira página pré-renderizada sozinho. */
export const PRERENDER_PATHS: readonly string[] = [
  "/",
  "/catalogo",
  ...CATALOG_NAV_ITEMS.map((item) => item.path),
  "/404",
];

export type SiteContext = {
  /** Origem absoluta, sem barra final: https://dominio. */
  url: string;
  /** Só produção é indexável; preview e local saem com noindex. */
  indexable: boolean;
};

export type RouteMeta = {
  path: string;
  title: string;
  description: string;
  /** Ausente em página de erro: o 404.html é servido em qualquer caminho. */
  canonical: string | null;
  robots: "index, follow" | "noindex";
  ogImage: string;
  jsonLd: readonly object[];
};

type RouteCopy = {
  title: string;
  description: string;
  notFound?: boolean;
};

function joinBrands(brands: readonly string[]): string {
  return brands.length > 1
    ? `${brands.slice(0, -1).join(", ")} e ${brands[brands.length - 1]}`
    : (brands[0] ?? "");
}

function copyOf(pathname: string): RouteCopy {
  if (pathname === "/") {
    return {
      title: `${SITE_NAME} | Produtos à pronta-entrega em Manaus`,
      description:
        "Boticário, Eudora, OUI, Natura, Avon, moda íntima, joias e acessórios à pronta-entrega em Manaus. Escolha no catálogo e peça pelo WhatsApp.",
    };
  }

  if (pathname === "/catalogo") {
    return {
      title: `Catálogos | ${SITE_NAME} em Manaus`,
      description:
        "Escolha um catálogo da Aura Beauty: cosméticos, perfumes, moda íntima, joias e acessórios à pronta-entrega em Manaus.",
    };
  }

  const item = CATALOG_NAV_ITEMS.find((entry) => entry.path === pathname);
  if (item) {
    return {
      title: `${item.label} à pronta-entrega em Manaus | ${SITE_NAME}`,
      description: `Produtos ${joinBrands(item.brands)} à pronta-entrega em Manaus. Veja os preços e peça pelo WhatsApp com a ${SITE_NAME}.`,
    };
  }

  return {
    title: `Página não encontrada | ${SITE_NAME}`,
    description: "O endereço que você abriu não existe ou mudou.",
    notFound: true,
  };
}

export function getRouteMeta(pathname: string, site: SiteContext): RouteMeta {
  const copy = copyOf(pathname);

  return {
    path: pathname,
    title: copy.title,
    description: copy.description,
    canonical: copy.notFound ? null : `${site.url}${pathname}`,
    robots: site.indexable && !copy.notFound ? "index, follow" : "noindex",
    ogImage: `${site.url}${OG_IMAGE_PATH}`,
    jsonLd: [],
  };
}
