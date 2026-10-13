import { describe, expect, it } from "vitest";
import { instagramHandle } from "./instagram";

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
    expect(instagramHandle("instagram.com/aura")).toBe("");
    expect(instagramHandle("https://instagram.com/")).toBe("");
    expect(instagramHandle("https://notinstagram.com/aura")).toBe("");
  });
});
