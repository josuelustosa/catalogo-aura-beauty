import { describe, expect, it } from "vitest";
import { imageFileName, imagePath } from "./catalog-image";

describe("catalog-image", () => {
  it("monta o nome e o caminho publico de uma variante", () => {
    const image = { slug: "bot-001", hash: "0123abcd" };

    expect(imageFileName(image, 320, "avif")).toBe("bot-001-320.0123abcd.avif");
    expect(imagePath(image, 960, "webp")).toBe(
      "/img/bot-001-960.0123abcd.webp",
    );
  });
});
