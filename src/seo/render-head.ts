import { serializeJsonLd } from "./json-ld";
import { SITE_NAME, type RouteMeta } from "./route-meta";

/** Três rótulos do menu têm "&" cru; sem escape o HTML sai inválido. */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const meta = (attribute: "name" | "property", key: string, content: string) =>
  `<meta ${attribute}="${key}" content="${escapeHtml(content)}" />`;

export function renderHead(route: RouteMeta): string {
  const tags = [
    `<title>${escapeHtml(route.title)}</title>`,
    meta("name", "description", route.description),
    meta("name", "robots", route.robots),
  ];

  if (route.canonical) {
    tags.push(`<link rel="canonical" href="${escapeHtml(route.canonical)}" />`);
  }

  // Mesmo srcset AVIF e sizes do <Picture>: o navegador escolhe o mesmo
  // candidato e reaproveita o download.
  if (route.lcpImage) {
    tags.push(
      `<link rel="preload" as="image" type="image/avif" imagesrcset="${escapeHtml(route.lcpImage.srcSet)}" imagesizes="${escapeHtml(route.lcpImage.sizes)}" fetchpriority="high" />`,
    );
  }

  tags.push(
    meta("property", "og:type", "website"),
    meta("property", "og:locale", "pt_BR"),
    meta("property", "og:site_name", SITE_NAME),
    meta("property", "og:title", route.title),
    meta("property", "og:description", route.description),
  );
  if (route.canonical) {
    tags.push(meta("property", "og:url", route.canonical));
  }
  tags.push(
    meta("property", "og:image", route.ogImage),
    meta("property", "og:image:width", "1200"),
    meta("property", "og:image:height", "630"),
    meta("property", "og:image:alt", SITE_NAME),
    meta("name", "twitter:card", "summary_large_image"),
  );

  return tags.join("\n    ");
}

/** Antes do </body>: a lista de produtos cresce com o catálogo. */
export function renderBodyEnd(route: RouteMeta): string {
  return route.jsonLd
    .map(
      (data) =>
        `<script type="application/ld+json">${serializeJsonLd(data)}</script>`,
    )
    .join("\n    ");
}
