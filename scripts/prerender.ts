import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { EntryServer } from "../src/ssg/entry-contract.ts";
import { buildRobots, buildSitemap } from "./site-files.ts";
import { checkPage } from "./validate-html.ts";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const distDir = path.join(projectRoot, "dist");
const entryPath = path.join(projectRoot, "dist-ssr/entry-server.js");

const ROOT_PLACEHOLDER = /<div id="root">\s*<!--app-html-->\s*<\/div>/g;
const SAFE_PATH = /^\/(?:[a-z0-9-]+(?:\/[a-z0-9-]+)*)?$/;

export class PrerenderError extends Error {}

/**
 * Origem do canonical, do sitemap e do OG. VERCEL_PROJECT_PRODUCTION_URL já
 * acompanha o domínio próprio; SITE_URL só é preciso se ele não for o mais
 * curto (ex.: www com redirect do apex).
 */
export function resolveSiteUrl(env: NodeJS.ProcessEnv): string {
  const explicit = env.SITE_URL?.trim();
  if (explicit) {
    return explicit.replace(/\/+$/, "");
  }

  const production = env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  return production ? `https://${production}` : "http://localhost:4173";
}

/** "/" → index.html; "/catalogo/x" → catalogo/x.html. */
export function outputFileOf(pathname: string): string {
  return pathname === "/" ? "index.html" : `${pathname.slice(1)}.html`;
}

function countOf(text: string, pattern: string | RegExp): number {
  return typeof pattern === "string"
    ? text.split(pattern).length - 1
    : (text.match(pattern) ?? []).length;
}

/** O template precisa ter cada marcador exatamente uma vez. */
export function assertTemplate(template: string): void {
  const markers: [string, string | RegExp][] = [
    ["<!--app-head-->", "<!--app-head-->"],
    ['<div id="root"><!--app-html--></div>', ROOT_PLACEHOLDER],
    ["<!--app-body-end-->", "<!--app-body-end-->"],
    ["<html ...>", /<html[\s>]/g],
  ];

  for (const [name, pattern] of markers) {
    const count = countOf(template, pattern);
    if (count !== 1) {
      throw new PrerenderError(
        `template dist/index.html: ${name} aparece ${count} vezes, esperado 1`,
      );
    }
  }
}

export function fillTemplate(
  template: string,
  page: {
    pathname: string;
    siteUrl: string;
    head: string;
    html: string;
    bodyEnd?: string;
  },
): string {
  // Colado de propósito: texto em branco dentro de #root impede a hidratação.
  return template
    .replace(
      /<html([^>]*)>/,
      `<html$1 data-prerender-path="${page.pathname}" data-site-url="${page.siteUrl}">`,
    )
    .replace("<!--app-head-->", page.head)
    .replace(ROOT_PLACEHOLDER, () => `<div id="root">${page.html}</div>`)
    .replace("<!--app-body-end-->", () => page.bodyEnd ?? "");
}

async function main(): Promise<void> {
  // react-dom/static escolhe o build de produção por NODE_ENV ao ser carregado.
  process.env.NODE_ENV ??= "production";
  const entry = (await import(pathToFileURL(entryPath).href)) as EntryServer;

  const template = await readFile(path.join(distDir, "index.html"), "utf8");
  assertTemplate(template);

  for (const pathname of entry.PRERENDER_PATHS) {
    if (!SAFE_PATH.test(pathname)) {
      throw new PrerenderError(
        `caminho ${pathname} fora de ^[a-z0-9-]: a guarda de hidratação compara com location.pathname, que viria codificado`,
      );
    }
  }

  // A home sobrescreve o template: fica por último.
  const imageFiles = new Set(
    await readdir(path.join(distDir, "img")).catch(() => []),
  );
  const production = process.env.VERCEL_ENV === "production";
  const site = { url: resolveSiteUrl(process.env), indexable: production };
  const paths = [
    ...entry.PRERENDER_PATHS.filter((pathname) => pathname !== "/"),
    "/",
  ];
  const errors: string[] = [];

  for (const pathname of paths) {
    const html = await entry.render(pathname);
    const route = entry.getRouteMeta(pathname, site);
    const page = fillTemplate(template, {
      pathname,
      siteUrl: site.url,
      head: entry.renderHead(route),
      html,
      bodyEnd: entry.renderBodyEnd(route),
    });
    const file = outputFileOf(pathname);
    const result = checkPage({
      pathname,
      page,
      fragment: html,
      expectation: entry.describePage(pathname),
      whatsappNumber: entry.WHATSAPP_NUMBER,
      imageFiles,
      production,
    });

    for (const warning of result.warnings) {
      console.warn(`[prerender] arquivo=dist/${file} aviso=${warning}`);
    }
    errors.push(...result.errors.map((error) => `dist/${file}: ${error}`));

    const target = path.join(distDir, file);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, page);
  }

  if (errors.length > 0) {
    throw new PrerenderError(
      `HTML gerado reprovado:\n  ${errors.join("\n  ")}`,
    );
  }

  await writeFile(
    path.join(distDir, "sitemap.xml"),
    buildSitemap(entry.PRERENDER_PATHS, site.url),
  );
  await writeFile(
    path.join(distDir, "robots.txt"),
    buildRobots(site.url, site.indexable),
  );

  console.info(
    `[prerender] rotas=${paths.length} site=${site.url} indexavel=${production ? "sim" : "nao"} ${paths.join(" ")}`,
  );
}

if (import.meta.main) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[prerender] erro=${message}`);
    process.exitCode = 1;
  });
}
