import { afterEach, describe, expect, it, vi } from "vitest";

import { getCatalogBySlug } from "../services/catalog.service";
import { buildJsonLd, serializeJsonLd } from "./json-ld";
import { renderBodyEnd } from "./render-head";
import { getRouteMeta } from "./route-meta";

const SITE = "https://aura.example";
const OG = `${SITE}/og.png`;

type Node = Record<string, unknown>;

describe("buildJsonLd", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("descreve o negocio local e o site na home, sem SearchAction", () => {
    const [business, website] = buildJsonLd(
      "/",
      SITE,
      "Aura Beauty",
      OG,
    ) as Node[];

    expect(business).toMatchObject({
      "@type": "LocalBusiness",
      name: "Aura Beauty",
      url: `${SITE}/`,
      areaServed: { "@type": "City", name: "Manaus" },
      address: { addressLocality: "Manaus", addressRegion: "AM" },
    });
    expect(website).toMatchObject({ "@type": "WebSite", url: `${SITE}/` });
    expect(JSON.stringify(website)).not.toContain("SearchAction");
  });

  it("so publica telefone e Instagram quando configurados", async () => {
    const homeWith = async (env: Record<string, string>) => {
      vi.resetModules();
      for (const [key, value] of Object.entries(env)) {
        vi.stubEnv(key, value);
      }
      const { buildJsonLd: fresh } = await import("./json-ld");
      return fresh("/", SITE, "Aura Beauty", OG)[0] as Node;
    };

    expect(
      await homeWith({
        VITE_WHATSAPP_NUMBER: "5592999999999",
        VITE_INSTAGRAM_URL: "https://instagram.com/aura",
      }),
    ).toMatchObject({
      telephone: "+5592999999999",
      sameAs: ["https://instagram.com/aura"],
    });

    const bare = await homeWith({
      VITE_WHATSAPP_NUMBER: "",
      VITE_INSTAGRAM_URL: "",
    });
    expect(bare).not.toHaveProperty("telephone");
    expect(bare).not.toHaveProperty("sameAs");
  });

  it("lista os produtos do catalogo com oferta em reais e breadcrumb", () => {
    const products = getCatalogBySlug("boticario-eudora-e-oui")?.products ?? [];
    const [page, crumbs] = buildJsonLd(
      "/catalogo/boticario-eudora-e-oui",
      SITE,
      "Aura Beauty",
      OG,
    ) as Node[];
    const list = page.mainEntity as {
      itemListElement: Node[];
      numberOfItems: number;
    };
    const first = list.itemListElement[0].item as Node;

    expect(page).toMatchObject({
      "@type": "CollectionPage",
      name: "o Boticário, Eudora & OUI",
    });
    expect(list.numberOfItems).toBe(products.length);
    expect(first).toMatchObject({
      "@type": "Product",
      name: products[0].title,
      offers: {
        price: (products[0].promoPrice ?? products[0].price).toFixed(2),
        priceCurrency: "BRL",
        availability: "https://schema.org/InStock",
      },
    });
    expect(crumbs).toMatchObject({ "@type": "BreadcrumbList" });
    expect(
      (crumbs.itemListElement as Node[]).map((crumb) => crumb.item),
    ).toEqual([
      `${SITE}/`,
      `${SITE}/catalogo`,
      `${SITE}/catalogo/boticario-eudora-e-oui`,
    ]);
  });

  it("so breadcrumb no seletor de catalogos e nada no 404", () => {
    expect(buildJsonLd("/catalogo", SITE, "Aura Beauty", OG)).toHaveLength(1);
    expect(buildJsonLd("/404", SITE, "Aura Beauty", OG)).toEqual([]);
  });
});

describe("serializacao", () => {
  it("impede que um titulo feche o <script>", () => {
    const serialized = serializeJsonLd({
      name: "</script><script>alert(1)</script>",
    });

    expect(serialized).not.toContain("<");
    expect(JSON.parse(serialized)).toEqual({
      name: "</script><script>alert(1)</script>",
    });
  });

  it("emite um <script> por bloco, com JSON valido", () => {
    const body = renderBodyEnd(
      getRouteMeta("/catalogo/moda-intima", { url: SITE, indexable: true }),
    );
    const scripts = [
      ...body.matchAll(
        /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g,
      ),
    ];

    expect(scripts).toHaveLength(2);
    for (const [, json] of scripts) {
      expect(() => JSON.parse(json)).not.toThrow();
    }
  });
});
