import type { RouteMeta, SiteContext } from "../seo/route-meta";

export type PageExpectation = {
  /** Texto exato da <h1>; sem ele, basta uma <h1> não vazia. */
  heading?: string;
  hasProducts: boolean;
  hasImages: boolean;
};

/** O que scripts/prerender.ts consome de dist-ssr/entry-server.js. */
export type EntryServer = {
  render(pathname: string): Promise<string>;
  describePage(pathname: string): PageExpectation;
  getRouteMeta(pathname: string, site: SiteContext): RouteMeta;
  renderHead(route: RouteMeta): string;
  PRERENDER_PATHS: readonly string[];
  WHATSAPP_NUMBER: string;
};
