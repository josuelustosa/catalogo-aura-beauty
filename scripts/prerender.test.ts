import { describe, expect, it } from "vitest";
import {
  assertTemplate,
  fillTemplate,
  outputFileOf,
  PrerenderError,
} from "./prerender.ts";

const TEMPLATE = `<!doctype html>
<html lang="pt-br">
  <head>
    <!--app-head-->
    <script type="module" src="/assets/index.js"></script>
  </head>
  <body>
    <div id="root">
      <!--app-html-->
    </div>
    <!--app-body-end-->
  </body>
</html>`;

describe("prerender", () => {
  it("mapeia cada caminho para o arquivo que a Vercel serve com cleanUrls", () => {
    expect(outputFileOf("/")).toBe("index.html");
    expect(outputFileOf("/catalogo")).toBe("catalogo.html");
    expect(outputFileOf("/catalogo/moda-intima")).toBe(
      "catalogo/moda-intima.html",
    );
    expect(outputFileOf("/404")).toBe("404.html");
  });

  it("cola o HTML no #root, sem espaco que impeça a hidratacao", () => {
    const page = fillTemplate(TEMPLATE, {
      pathname: "/catalogo",
      head: "<title>T</title>",
      html: "<header>$&</header>",
      bodyEnd: '<script type="application/ld+json">{}</script>',
    });

    expect(page).toContain(
      '<html lang="pt-br" data-prerender-path="/catalogo">',
    );
    expect(page).toContain('<div id="root"><header>$&</header></div>');
    expect(page).toContain("<title>T</title>");
    expect(page).toContain('<script type="application/ld+json">{}</script>');
    expect(page).not.toContain("<!--app-");
  });

  it("recusa template sem marcador ou com marcador repetido", () => {
    expect(() => assertTemplate(TEMPLATE)).not.toThrow();
    expect(() =>
      assertTemplate(TEMPLATE.replace("<!--app-head-->", "")),
    ).toThrow(PrerenderError);
    expect(() =>
      assertTemplate(
        TEMPLATE.replace(
          "<!--app-body-end-->",
          "<!--app-body-end--><!--app-body-end-->",
        ),
      ),
    ).toThrow("<!--app-body-end--> aparece 2 vezes");
  });
});
