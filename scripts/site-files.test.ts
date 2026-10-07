import { describe, expect, it } from "vitest";
import { buildRobots, buildSitemap } from "./site-files.ts";

describe("sitemap e robots", () => {
  it("lista as rotas com URL absoluta e sem o 404", () => {
    const sitemap = buildSitemap(
      ["/", "/catalogo", "/catalogo/moda-intima", "/404"],
      "https://aura.example",
    );

    expect(sitemap).toContain("<loc>https://aura.example/</loc>");
    expect(sitemap).toContain(
      "<loc>https://aura.example/catalogo/moda-intima</loc>",
    );
    expect(sitemap).not.toContain("/404");
    expect(sitemap.match(/<url>/g)).toHaveLength(3);
  });

  it("libera e aponta o sitemap so em producao", () => {
    expect(buildRobots("https://aura.example", true)).toBe(
      "User-agent: *\nAllow: /\n\nSitemap: https://aura.example/sitemap.xml\n",
    );
    expect(buildRobots("https://aura.example", false)).toBe(
      "User-agent: *\nDisallow: /\n",
    );
  });
});
