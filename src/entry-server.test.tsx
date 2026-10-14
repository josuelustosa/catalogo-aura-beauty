import { Suspense } from "react";
import { Outlet } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

import { BRANDS } from "./content/brands";
import { render, renderWithRoutes } from "./entry-server";
import { CATALOG_NAV_ITEMS } from "./mocks/nav-item.mock";
import RouteErrorBoundary, {
  RootErrorBoundary,
} from "./router/RouteErrorBoundary";
import {
  getCatalogBySlug,
  getFeaturedProducts,
} from "./services/catalog.service";
import { HOME_HEADING } from "./ssg/page-expectations";
import { formatPrice } from "./utils/format-price";

const ROUTES = [
  "/",
  "/catalogo",
  ...CATALOG_NAV_ITEMS.map((i) => i.path),
  "/404",
];

describe("entry-server", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("roda no Node, sem window", () => {
    expect(typeof window).toBe("undefined");
  });

  it.each(ROUTES)("renderiza %s sem fallback de Suspense", async (path) => {
    const html = await render(path);

    expect(html).toContain("<header");
    expect(html).toContain("<main>");
    expect(html).toContain("<footer");
    expect(html).toContain('aria-label="Falar com a Aura Beauty no WhatsApp"');
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

  it("entrega a home com a h1 local e os destaques", async () => {
    const html = await render("/");
    const featured = getFeaturedProducts();

    expect(html.match(/<h1[\s>]/g)).toHaveLength(1);
    expect(html.replace(/<[^>]+>/g, "")).toContain(HOME_HEADING);
    expect(featured.length).toBeGreaterThan(0);
    for (const product of featured) {
      expect(html).toContain(product.title);
    }
    expect(html).toMatch(/<details[^>]* open=""/);
  });

  it("entrega as marcas como links para o catálogo de cada uma", async () => {
    const html = await render("/");

    expect(html).toContain('id="marcas"');
    for (const brand of BRANDS) {
      expect(html).toContain(`href="/catalogo/${brand.catalog}"`);
      expect(html).toContain(`${brand.name}, ver catálogo`);
      expect(html).toContain(
        `src="${brand.logo}" alt="" width="${brand.width}" height="${brand.height}" loading="lazy"`,
      );
    }
  });

  it("so mostra o banner do Instagram com a URL configurada", async () => {
    const renderWith = async (url: string) => {
      vi.resetModules();
      vi.stubEnv("VITE_INSTAGRAM_URL", url);
      const entry = await import("./entry-server");
      return entry.render("/catalogo/moda-intima");
    };

    const without = await renderWith("");
    expect(without).toContain("Peça pelo WhatsApp");
    expect(without).not.toContain("Seguir no Instagram");

    const withUrl = await renderWith("https://www.instagram.com/aura.beauty/");
    expect(withUrl).toContain("Seguir no Instagram");
    expect(withUrl).toContain("@aura.beauty");
    expect(withUrl).toContain('href="https://www.instagram.com/aura.beauty/"');

    // Só o perfil, como costuma ser preenchido na Vercel.
    const withHandle = await renderWith("aura.beauty");
    expect(withHandle).toContain(
      'href="https://www.instagram.com/aura.beauty/"',
    );
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

  it("continua falhando com os error boundaries ligados", async () => {
    function Broken(): never {
      throw new Error("quebrou");
    }

    // O renderizador de servidor ignora boundaries: o erro chega ao onError.
    const routes = [
      {
        element: <Outlet />,
        errorElement: <RootErrorBoundary />,
        children: [
          {
            path: "/",
            errorElement: <RouteErrorBoundary />,
            element: (
              <Suspense fallback={<div>Carregando...</div>}>
                <Broken />
              </Suspense>
            ),
          },
        ],
      },
    ];

    await expect(renderWithRoutes(routes, "/")).rejects.toThrow(
      "falha ao renderizar /: Error: quebrou",
    );
  });

  it("falha quando o proprio layout lanca, em vez de gravar o RootErrorBoundary", async () => {
    function BrokenLayout(): never {
      throw new Error("layout quebrou");
    }

    // Fora de <Suspense>, o erro rejeita o prerender direto.
    const routes = [
      {
        element: <BrokenLayout />,
        errorElement: <RootErrorBoundary />,
        children: [{ path: "/", element: <p>conteudo</p> }],
      },
    ];

    await expect(renderWithRoutes(routes, "/")).rejects.toThrow(
      "layout quebrou",
    );
  });
});
