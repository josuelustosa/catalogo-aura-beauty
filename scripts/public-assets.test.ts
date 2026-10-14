import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { describe, expect, it } from "vitest";

import { BRANDS } from "../src/content/brands.ts";
import {
  OG_IMAGE_HEIGHT,
  OG_IMAGE_PATH,
  OG_IMAGE_WIDTH,
} from "../src/seo/og-image.ts";

const publicDir = fileURLToPath(new URL("../public/", import.meta.url));

describe("logos da seção Marcas", () => {
  it.each(BRANDS)("$name existe com as dimensões declaradas", async (brand) => {
    const file = path.join(publicDir, brand.logo);
    expect(existsSync(file)).toBe(true);

    // width/height errados distorcem o logo ou deslocam o layout.
    const { width, height } = await sharp(file).metadata();
    expect({ width, height }).toEqual({
      width: brand.width,
      height: brand.height,
    });
  });
});

describe("imagem de Open Graph", () => {
  const file = path.join(publicDir, OG_IMAGE_PATH);

  it("tem as dimensões declaradas no <head>", async () => {
    const { width, height } = await sharp(file).metadata();
    expect({ width, height }).toEqual({
      width: OG_IMAGE_WIDTH,
      height: OG_IMAGE_HEIGHT,
    });
  });

  it("cabe no limite da prévia do WhatsApp", () => {
    // Acima de ~300 KB o WhatsApp mostra o link sem a imagem.
    expect(statSync(file).size).toBeLessThan(300 * 1024);
  });
});
