/** O que scripts/prerender.ts consome de dist-ssr/entry-server.js. */
export type EntryServer = {
  render(pathname: string): Promise<string>;
  PRERENDER_PATHS: readonly string[];
};
