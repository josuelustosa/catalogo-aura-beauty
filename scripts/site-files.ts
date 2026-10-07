const escapeXml = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Sai das mesmas rotas do prerender, sem lista paralela; o 404 fica de fora. */
export function buildSitemap(
  paths: readonly string[],
  siteUrl: string,
): string {
  const urls = paths
    .filter((pathname) => pathname !== "/404")
    .map(
      (pathname) => `  <url><loc>${escapeXml(siteUrl + pathname)}</loc></url>`,
    );

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    "</urlset>",
    "",
  ].join("\n");
}

/** Fora de produção bloqueia tudo: preview indexado compete com o domínio real. */
export function buildRobots(siteUrl: string, indexable: boolean): string {
  return indexable
    ? `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`
    : "User-agent: *\nDisallow: /\n";
}
