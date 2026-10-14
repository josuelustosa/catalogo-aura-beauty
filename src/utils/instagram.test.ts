import { describe, expect, it } from "vitest";
import { instagramHandle, instagramProfileUrl } from "./instagram";

describe("instagramProfileUrl", () => {
  it("aceita o perfil puro, com @ ou como URL", () => {
    const expected = "https://www.instagram.com/loja.aura_beauty/";

    expect(instagramProfileUrl("loja.aura_beauty")).toBe(expected);
    expect(instagramProfileUrl(" @loja.aura_beauty ")).toBe(expected);
    expect(instagramProfileUrl("instagram.com/loja.aura_beauty")).toBe(
      expected,
    );
    expect(
      instagramProfileUrl("https://www.instagram.com/loja.aura_beauty?igsh=x"),
    ).toBe(expected);
  });

  it("devolve vazio sem perfil valido do Instagram", () => {
    expect(instagramProfileUrl(undefined)).toBe("");
    expect(instagramProfileUrl("")).toBe("");
    expect(instagramProfileUrl("https://instagram.com/")).toBe("");
    expect(instagramProfileUrl("https://notinstagram.com/aura")).toBe("");
    expect(instagramProfileUrl("perfil com espaço")).toBe("");
  });
});

describe("instagramHandle", () => {
  it("extrai o perfil da URL", () => {
    expect(instagramHandle("https://www.instagram.com/aura.beauty/")).toBe(
      "@aura.beauty",
    );
    expect(instagramHandle("https://instagram.com/aura_beauty?hl=pt")).toBe(
      "@aura_beauty",
    );
  });

  it("devolve vazio para URL invalida ou de outro site", () => {
    expect(instagramHandle("")).toBe("");
    expect(instagramHandle("https://instagram.com/")).toBe("");
    expect(instagramHandle("https://notinstagram.com/aura")).toBe("");
  });
});
