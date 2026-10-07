import { describe, expect, it } from "vitest";
import {
  imageFileName,
  imagePath,
  imageSize,
  imageSrcSet,
} from "./catalog-image";

describe("catalog-image", () => {
  const image = { slug: "bot-001", hash: "0123abcd", widths: [320, 480, 500] };

  it("monta o nome e o caminho publico de uma variante", () => {
    expect(imageFileName(image, 320, "avif")).toBe("bot-001-320.0123abcd.avif");
    expect(imagePath(image, 960, "webp")).toBe(
      "/img/bot-001-960.0123abcd.webp",
    );
  });

  it("monta o srcset com descritor de largura e usa a maior como intrinseca", () => {
    expect(imageSrcSet(image, "webp")).toBe(
      "/img/bot-001-320.0123abcd.webp 320w, /img/bot-001-480.0123abcd.webp 480w, /img/bot-001-500.0123abcd.webp 500w",
    );
    expect(imageSize(image)).toBe(500);
  });
});
