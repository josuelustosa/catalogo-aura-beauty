import type { PageExpectation } from "../src/ssg/entry-contract.ts";

export type PageCheck = {
  pathname: string;
  /** HTML completo do arquivo gravado. */
  page: string;
  /** Só o que o React renderizou dentro de #root. */
  fragment: string;
  expectation: PageExpectation;
  whatsappNumber: string;
  /** Arquivos que existem em dist/img. */
  imageFiles: ReadonlySet<string>;
  production: boolean;
};

export type CheckResult = { errors: string[]; warnings: string[] };

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: String.fromCharCode(0xa0),
};

function decodeEntities(text: string): string {
  return text.replace(
    /&(#x[0-9a-f]+|#\d+|[a-z]+);/gi,
    (match, code: string) => {
      if (code[0] === "#") {
        const value =
          code[1].toLowerCase() === "x"
            ? Number.parseInt(code.slice(2), 16)
            : Number.parseInt(code.slice(1), 10);
        return String.fromCodePoint(value);
      }

      return ENTITIES[code.toLowerCase()] ?? match;
    },
  );
}

/** Texto visível de um trecho de HTML, como o leitor de tela o veria. */
export function textOf(html: string): string {
  return decodeEntities(
    html.replace(/<!--[\s\S]*?-->/g, "").replace(/<[^>]+>/g, ""),
  )
    .replace(/\s+/g, " ")
    .trim();
}

function countOf(text: string, needle: string): number {
  return text.split(needle).length - 1;
}

/**
 * Sem estas checagens, uma divergência entre as passagens de build faz o React
 * renderizar tudo no cliente: o site funciona e o SEO some sem sintoma.
 */
export function checkPage(check: PageCheck): CheckResult {
  const { page, fragment, expectation, whatsappNumber } = check;
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!page.includes(`data-prerender-path="${check.pathname}"`)) {
    errors.push("<html> sem data-prerender-path desta rota");
  }
  if (!page.includes('<div id="root"><')) {
    errors.push("#root vazio ou com espaço antes do conteúdo");
  }
  if (countOf(page, "<title>") !== 1) {
    errors.push(`${countOf(page, "<title>")} <title> no arquivo, esperado 1`);
  }
  if (page.includes("<!--app-")) {
    errors.push("marcador do template sobrando");
  }

  for (const marker of ["<!--$!-->", "<!--$?-->", "<template", "Carregando"]) {
    if (fragment.includes(marker)) {
      errors.push(`fallback de Suspense no HTML (${marker})`);
    }
  }

  const headings = [...fragment.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/g)];
  const heading = headings[0] ? textOf(headings[0][1]) : "";
  if (headings.length !== 1) {
    errors.push(`${headings.length} <h1>, esperado 1`);
  } else if (!heading) {
    errors.push("<h1> vazia");
  } else if (
    expectation.heading !== undefined &&
    heading !== expectation.heading
  ) {
    errors.push(`<h1> "${heading}", esperado "${expectation.heading}"`);
  }

  if (fragment.includes("wa.me/?text=")) {
    const message =
      "link do WhatsApp sem número (VITE_WHATSAPP_NUMBER vazia no build)";
    (check.production ? errors : warnings).push(message);
  } else if (
    expectation.hasProducts &&
    !fragment.includes(`wa.me/${whatsappNumber}?text=`)
  ) {
    errors.push(`catálogo com produtos sem link wa.me/${whatsappNumber}`);
  }

  const imagesOf = (html: string) =>
    new Set([...html.matchAll(/\/img\/([^"\s,?]+)/g)].map((match) => match[1]));
  if (expectation.hasImages && imagesOf(fragment).size === 0) {
    errors.push("catálogo com foto no manifesto, mas nenhuma /img/ no HTML");
  }
  // O arquivo inteiro: inclui o preload do <head> e o JSON-LD.
  for (const image of imagesOf(page)) {
    if (!check.imageFiles.has(image)) {
      errors.push(`/img/${image} referenciada e ausente em dist/img`);
    }
  }

  return { errors, warnings };
}
