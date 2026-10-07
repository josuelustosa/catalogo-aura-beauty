import { Suspense } from "react";
import { describe, expect, it } from "vitest";

import { render, renderWithRoutes } from "./entry-server";
import { CATALOG_NAV_ITEMS } from "./mocks/nav-item.mock";
import { getCatalogBySlug } from "./services/catalog.service";
import { formatPrice } from "./utils/format-price";

const ROUTES = [
  "/",
  "/catalogo",
  ...CATALOG_NAV_ITEMS.map((i) => i.path),
  "/404",
];

describe("entry-server", () => {
  it("roda no Node, sem window", () => {
    expect(typeof window).toBe("undefined");
  });

  it.each(ROUTES)("renderiza %s sem fallback de Suspense", async (path) => {
    const html = await render(path);

    expect(html).toContain("<header");
    expect(html).toContain("<main>");
    expect(html).not.toContain("Carregando");
    expect(html).not.toContain("<!--$!-->");
    expect(html).not.toContain("<!--$?-->");
    expect(html).not.toContain("<script");
  });

  it("entrega os produtos do catalogo no HTML", async () => {
    const item = CATALOG_NAV_ITEMS[0];
    const catalog = getCatalogBySlug(item.slug);
    const product = catalog?.products[0];
    if (!product) {
      throw new Error("o fallback deveria ter produtos no primeiro catalogo");
    }

    const html = await render(item.path);
    expect(html).toContain(product.title);
    expect(html).toContain(formatPrice(product.promoPrice ?? product.price));
    expect(html).toContain('aria-current="page"');
  });

  it("falha quando um componente lanca, em vez de gravar o fallback", async () => {
    function Broken(): never {
      throw new Error("quebrou");
    }

    // Igual às rotas do app: o erro cai numa boundary e o prerender resolve.
    const inSuspense = (
      <Suspense fallback={<div>Carregando...</div>}>
        <Broken />
      </Suspense>
    );

    await expect(
      renderWithRoutes([{ path: "/", element: inSuspense }], "/"),
    ).rejects.toThrow("falha ao renderizar /: Error: quebrou");
  });
});
