import { describe, expect, it } from "vitest";
import {
  cloudinaryUrl,
  effectiveWidths,
  imageSlug,
  imageSourceOf,
  isImageContentType,
  parseContentType,
  serializeImages,
} from "./catalog-images.ts";

const ID = "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms";
const THUMBNAIL = `https://drive.google.com/thumbnail?id=${ID}&sz=w2000`;

describe("imageSourceOf", () => {
  it.each([
    ["compartilhar", `https://drive.google.com/file/d/${ID}/view?usp=sharing`],
    ["celular", `https://drive.google.com/file/d/${ID}/view?usp=drivesdk`],
    ["preview", `https://drive.google.com/file/d/${ID}/preview`],
    ["open", `https://drive.google.com/open?id=${ID}`],
    ["uc", `https://drive.google.com/uc?id=${ID}&export=download`],
    ["docs uc", `https://docs.google.com/uc?export=view&id=${ID}`],
    ["thumbnail", `https://drive.google.com/thumbnail?id=${ID}&sz=w400`],
  ])("normaliza o link do Drive (%s) para o thumbnail", (_, imageUrl) => {
    expect(imageSourceOf({ id: "BOT-001", imageUrl }, "cloud")).toEqual({
      kind: "source",
      url: THUMBNAIL,
      origin: "column",
      host: "drive",
    });
  });

  it.each([
    ["pasta do Drive", "https://drive.google.com/drive/folders/abc123"],
    ["nome de arquivo", "BOT-001.jpg"],
    ["protocolo", "ftp://exemplo.com/foto.jpg"],
  ])("recusa valor invalido na coluna (%s)", (_, imageUrl) => {
    expect(imageSourceOf({ id: "BOT-001", imageUrl }, "cloud")).toMatchObject({
      kind: "invalid",
    });
  });

  it("da precedencia a coluna e classifica o host", () => {
    expect(
      imageSourceOf(
        {
          id: "BOT-001",
          imageUrl: "https://res.cloudinary.com/outra/image/upload/x.png",
        },
        "cloud",
      ),
    ).toEqual({
      kind: "source",
      url: "https://res.cloudinary.com/outra/image/upload/x.jpg",
      origin: "column",
      host: "cloudinary",
    });
    expect(
      imageSourceOf(
        { id: "BOT-001", imageUrl: "https://exemplo.com/foto.jpg" },
        undefined,
      ),
    ).toMatchObject({ kind: "source", origin: "column", host: "other" });
  });

  it.each([
    [
      "copiado do painel",
      "https://res.cloudinary.com/xtny4sff/image/upload/v1791484539/TST-005.heic",
      "https://res.cloudinary.com/xtny4sff/image/upload/TST-005.jpg",
    ],
    [
      "sem extensao",
      "https://res.cloudinary.com/xtny4sff/image/upload/v1/TST-005",
      "https://res.cloudinary.com/xtny4sff/image/upload/TST-005.jpg",
    ],
    [
      "com transformacao, intocado",
      "https://res.cloudinary.com/xtny4sff/image/upload/c_fill,w_300/TST-005.png",
      "https://res.cloudinary.com/xtny4sff/image/upload/c_fill,w_300/TST-005.png",
    ],
  ])(
    "pede .jpg sem versao ao link colado do Cloudinary (%s)",
    (_, imageUrl, url) => {
      expect(imageSourceOf({ id: "TST-005", imageUrl }, "xtny4sff")).toEqual({
        kind: "source",
        url,
        origin: "column",
        host: "cloudinary",
      });
    },
  );

  it("deriva a URL do Cloudinary pelo id, sem pasta e sem versao", () => {
    expect(imageSourceOf({ id: "BOT-001" }, "xtny4sff")).toEqual({
      kind: "source",
      url: "https://res.cloudinary.com/xtny4sff/image/upload/BOT-001.jpg",
      origin: "derived",
      host: "cloudinary",
    });
    expect(cloudinaryUrl("xtny4sff", "BOT 001")).toBe(
      "https://res.cloudinary.com/xtny4sff/image/upload/BOT%20001.jpg",
    );
  });

  it("nao inventa origem sem coluna e sem cloud name", () => {
    expect(imageSourceOf({ id: "BOT-001" }, undefined)).toBeUndefined();
    expect(imageSourceOf({ id: "BOT-001" }, "")).toBeUndefined();
  });
});

describe("imageSlug e effectiveWidths", () => {
  it("deriva o slug do id sem acento, caixa ou simbolos", () => {
    expect(imageSlug("BOT-001")).toBe("bot-001");
    expect(imageSlug("bot_001")).toBe("bot-001");
    expect(imageSlug(" Ação 01 ")).toBe("acao-01");
    expect(imageSlug("---")).toBe("produto");
  });

  it("limita as larguras ao lado menor do original, sem repetir", () => {
    expect(effectiveWidths(2000)).toEqual([320, 480, 640, 960]);
    expect(effectiveWidths(500)).toEqual([320, 480, 500]);
    expect(effectiveWidths(100)).toEqual([100]);
    expect(effectiveWidths(48, [32, 64])).toEqual([32, 48]);
  });
});

describe("content-type", () => {
  it("ignora parametros e caixa, e so aceita image/*", () => {
    expect(parseContentType("image/jpeg; charset=utf-8")).toBe("image/jpeg");
    expect(isImageContentType("IMAGE/PNG")).toBe(true);
    expect(isImageContentType("text/html; charset=UTF-8")).toBe(false);
    expect(isImageContentType("application/octet-stream")).toBe(false);
    expect(isImageContentType(null)).toBe(false);
  });
});

describe("serializeImages", () => {
  it("ordena as chaves e fixa a forma de cada entrada", () => {
    const first = serializeImages({
      "EUD-001": { slug: "eud-001", hash: "abcd1234", widths: [320, 480] },
      "BOT-001": { slug: "bot-001", hash: "0123abcd", widths: [320] },
    });
    const second = serializeImages({
      "BOT-001": { slug: "bot-001", hash: "0123abcd", widths: [320] },
      "EUD-001": { slug: "eud-001", hash: "abcd1234", widths: [320, 480] },
    });

    expect(first).toBe(second);
    expect(first).toContain(
      "// GERADO POR scripts/build-data.ts — NÃO EDITE À MÃO",
    );
    expect(first.indexOf('"BOT-001"')).toBeLessThan(first.indexOf('"EUD-001"'));
    expect(first).toContain("export const IMAGES: CatalogImages = {");
    expect(serializeImages({})).toContain("= {};");
  });
});
