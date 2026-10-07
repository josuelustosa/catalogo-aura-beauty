import { describe, expect, it } from "vitest";

import { CATALOG_NAV_ITEMS } from "../mocks/nav-item.mock";
import { escapeHtml, renderHead } from "./render-head";
import { getRouteMeta, PRERENDER_PATHS } from "./route-meta";

const production = { url: "https://aura.example", indexable: true };
const preview = { url: "https://aura.example", indexable: false };

describe("getRouteMeta", () => {
  it("deriva as rotas do menu, com a home primeiro e o 404 no fim", () => {
    expect(PRERENDER_PATHS).toEqual([
      "/",
      "/catalogo",
      ...CATALOG_NAV_ITEMS.map((item) => item.path),
      "/404",
    ]);
  });

  it("da titulo, descricao e canonical proprios a cada rota indexavel", () => {
    const titles = new Set<string>();

    for (const path of PRERENDER_PATHS.filter((path) => path !== "/404")) {
      const meta = getRouteMeta(path, production);
      expect(meta.title).toContain("Manaus");
      expect(meta.description.length).toBeGreaterThan(50);
      expect(meta.canonical).toBe(`https://aura.example${path}`);
      expect(meta.robots).toBe("index, follow");
      expect(meta.ogImage).toBe(
        "https://aura.example/aura-beauty-open-graph-1200x630.png",
      );
      titles.add(meta.title);
    }

    expect(titles.size).toBe(PRERENDER_PATHS.length - 1);
    expect(getRouteMeta("/catalogo/natura-e-avon", production)).toMatchObject({
      title: "Natura & Avon à pronta-entrega em Manaus | Aura Beauty",
      description: expect.stringContaining("Produtos Natura e Avon"),
    });
  });

  it("nunca indexa preview, 404 nem caminho desconhecido", () => {
    expect(getRouteMeta("/", preview).robots).toBe("noindex");
    expect(getRouteMeta("/404", production)).toMatchObject({
      robots: "noindex",
      canonical: null,
      title: "Página não encontrada | Aura Beauty",
    });
    expect(getRouteMeta("/xpto", production).robots).toBe("noindex");
  });
});

describe("renderHead", () => {
  it("escapa os rotulos com & e as aspas dos atributos", () => {
    const head = renderHead(
      getRouteMeta("/catalogo/boticario-eudora-e-oui", production),
    );

    expect(head).toContain(
      "<title>o Boticário, Eudora &amp; OUI à pronta-entrega em Manaus | Aura Beauty</title>",
    );
    expect(head).toContain(
      '<link rel="canonical" href="https://aura.example/catalogo/boticario-eudora-e-oui" />',
    );
    expect(head).toContain('<meta name="robots" content="index, follow" />');
    expect(head).toContain('<meta property="og:locale" content="pt_BR" />');
    expect(head).not.toMatch(/ & /);
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe(
      "&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;",
    );
  });

  it("omite canonical e og:url no 404", () => {
    const head = renderHead(getRouteMeta("/404", production));

    expect(head).not.toContain("canonical");
    expect(head).not.toContain("og:url");
    expect(head).toContain('<meta name="robots" content="noindex" />');
  });
});
