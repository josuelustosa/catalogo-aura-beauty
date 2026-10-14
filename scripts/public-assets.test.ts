import { existsSync, readdirSync, statSync } from "node:fs";
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

describe("ilustrações de Como funciona", () => {
  const dir = path.join(publicDir, "ilustracoes");
  const originals = readdirSync(dir).filter((f) => !f.endsWith("-281.webp"));

  // O srcset de HowItWorks.tsx monta <nome>-281.webp a partir do original.
  it.each(originals)("%s tem 562x700 e a versão de 281 px", async (name) => {
    const small = path.join(dir, name.replace(".webp", "-281.webp"));
    const [big, half] = await Promise.all([
      sharp(path.join(dir, name)).metadata(),
      sharp(small).metadata(),
    ]);
    expect({ width: big.width, height: big.height }).toEqual({
      width: 562,
      height: 700,
    });
    expect({ width: half.width, height: half.height }).toEqual({
      width: 281,
      height: 350,
    });
  });
});
