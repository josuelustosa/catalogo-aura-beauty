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
