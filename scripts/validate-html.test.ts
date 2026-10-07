import { describe, expect, it } from "vitest";
import { checkPage, textOf, type PageCheck } from "./validate-html.ts";

const fragment = (body: string) =>
  `<link rel="preload" as="image" href="/logo.svg"/><header><nav></nav></header><main>${body}</main>`;

const page = (pathname: string, root: string) =>
  `<!doctype html><html lang="pt-br" data-prerender-path="${pathname}"><head><title>T</title></head><body><div id="root">${root}</div></body></html>`;

const catalogBody = `<h1>Natura &amp; Avon</h1><article><img src="/img/nat-001-320.abcd1234.webp"/><a href="https://wa.me/5592999999999?text=Ol%C3%A1">Comprar</a></article>`;

function check(overrides: Partial<PageCheck> = {}): PageCheck {
  const body = fragment(catalogBody);
  return {
    pathname: "/catalogo/natura-e-avon",
    page: page("/catalogo/natura-e-avon", body),
    fragment: body,
    expectation: {
      heading: "Natura & Avon",
      hasProducts: true,
      hasImages: true,
    },
    whatsappNumber: "5592999999999",
    imageFiles: new Set(["nat-001-320.abcd1234.webp"]),
    production: true,
    ...overrides,
  };
}

describe("checkPage", () => {
  it("aprova um catalogo completo, com entidades e o preload do logo no #root", () => {
    expect(checkPage(check())).toEqual({ errors: [], warnings: [] });
  });

  it("decodifica entidades e comentarios do React no texto da h1", () => {
    expect(textOf("Natura &amp; Avon<!-- --> <!-- -->x &#x27;y&#39;")).toBe(
      "Natura & Avon x 'y'",
    );
  });

  it("reprova o HTML que cairia em renderizacao no cliente", () => {
    const fallback = fragment(
      "<!--$!--><template></template><div>Carregando...</div><!--/$-->",
    );
    const { errors } = checkPage(
      check({
        fragment: fallback,
        page: page("/catalogo/natura-e-avon", fallback),
      }),
    );

    expect(errors).toEqual(
      expect.arrayContaining([
        "fallback de Suspense no HTML (<!--$!-->)",
        "fallback de Suspense no HTML (Carregando)",
        "0 <h1>, esperado 1",
        "catálogo com produtos sem link wa.me/5592999999999",
        "catálogo com foto no manifesto, mas nenhuma /img/ no HTML",
      ]),
    );
  });

  it("reprova estrutura do arquivo: rota, #root, titulo e marcador", () => {
    const body = fragment(catalogBody);
    const broken = page("/outra", `\n${body}`).replace(
      "<title>T</title>",
      "<title>A</title><title>B</title><!--app-head-->",
    );

    expect(checkPage(check({ page: broken })).errors).toEqual([
      "<html> sem data-prerender-path desta rota",
      "#root vazio ou com espaço antes do conteúdo",
      "2 <title> no arquivo, esperado 1",
      "marcador do template sobrando",
    ]);
  });

  it("confere o texto da h1 e a existencia das fotos", () => {
    expect(
      checkPage(
        check({
          expectation: { heading: "Outro", hasProducts: true, hasImages: true },
          imageFiles: new Set(),
        }),
      ).errors,
    ).toEqual([
      '<h1> "Natura & Avon", esperado "Outro"',
      "/img/nat-001-320.abcd1234.webp referenciada e ausente em dist/img",
    ]);
  });

  it("sem numero: falha em producao e so avisa fora dela", () => {
    const body = fragment(catalogBody.replace("5592999999999", ""));
    const base = {
      fragment: body,
      page: page("/catalogo/natura-e-avon", body),
      whatsappNumber: "",
    };
    const message =
      "link do WhatsApp sem número (VITE_WHATSAPP_NUMBER vazia no build)";

    expect(checkPage(check(base)).errors).toContain(message);
    expect(checkPage(check({ ...base, production: false }))).toEqual({
      errors: [],
      warnings: [message],
    });
  });

  it("nao exige WhatsApp nem foto em pagina sem produto", () => {
    const body = fragment("<h1>Página não encontrada</h1>");
    expect(
      checkPage(
        check({
          pathname: "/404",
          fragment: body,
          page: page("/404", body),
          expectation: {
            heading: "Página não encontrada",
            hasProducts: false,
            hasImages: false,
          },
        }),
      ),
    ).toEqual({ errors: [], warnings: [] });
  });
});
