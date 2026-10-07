import { describe, expect, it } from "vitest";

import { formatPrice, normalizeCurrencySpacing } from "./format-price";

const NBSP = String.fromCharCode(0xa0);
const NARROW_NBSP = String.fromCharCode(0x202f);

describe("formatPrice", () => {
  it("formata em reais com NBSP depois do R$", () => {
    expect(formatPrice(189.5)).toBe(`R$${NBSP}189,50`);
    expect(formatPrice(1234.9)).toBe(`R$${NBSP}1.234,90`);
  });

  it.each([
    ["U+202F", `R$${NARROW_NBSP}189,50`],
    ["espaco comum", "R$ 189,50"],
    ["NBSP", `R$${NBSP}189,50`],
  ])("normaliza o %s de qualquer ICU para NBSP", (_, formatted) => {
    expect(normalizeCurrencySpacing(formatted)).toBe(`R$${NBSP}189,50`);
  });
});
