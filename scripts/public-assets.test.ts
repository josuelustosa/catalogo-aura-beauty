import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { describe, expect, it } from "vitest";

import { BRANDS } from "../src/content/brands.ts";

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
