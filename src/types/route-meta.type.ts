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
