import { describe, expect, it } from "vitest";
import {
  CATALOG_BRANDS,
  EXPECTED_HEADERS,
  parseRow,
  serializeProducts,
  sortProducts,
  validateBrands,
  validateHeader,
} from "./catalog-data.ts";

const validRow = (
  overrides: Partial<Record<number, unknown>> = {},
): unknown[] => {
  const row: unknown[] = [
    "BOT-001",
    "Boticário",
    "Produto de teste",
    100,
    80,
    "",
    true,
    1,
    false,
    "",
  ];

  for (const [index, value] of Object.entries(overrides)) {
    row[Number(index)] = value;
  }

  return row;
};

describe("contrato da planilha", () => {
  it("exige cabecalho e marcas exatamente na ordem definida", () => {
    expect(validateHeader(EXPECTED_HEADERS)).toBe(true);
    expect(validateHeader([...EXPECTED_HEADERS].reverse())).toBe(false);
    expect(validateBrands(CATALOG_BRANDS.map((brand) => [brand]))).toBe(true);
    expect(
      validateBrands([["marca"], ...CATALOG_BRANDS.map((brand) => [brand])]),
    ).toBe(true);
    expect(validateBrands([["Marca desconhecida"]])).toBe(false);
  });
});

describe("parseRow", () => {
  it("rejeita preco invalido, titulo vazio e id vazio", () => {
    expect(parseRow(validRow({ 3: "100" }), 2, 0)).toMatchObject({
      kind: "ignored",
      warnings: [{ line: 2, message: expect.stringContaining("preco") }],
    });
    expect(parseRow(validRow({ 2: "  " }), 3, 1).kind).toBe("ignored");
    expect(parseRow(validRow({ 0: "  " }), 4, 2).kind).toBe("ignored");
  });

  it("canonicaliza marcas e rejeita marca desconhecida", () => {
    const canonical = parseRow(validRow({ 1: " boticario " }), 2, 0);
    expect(canonical).toMatchObject({
      kind: "accepted",
      value: { product: { brand: "Boticário" } },
    });
    expect(canonical.warnings).toHaveLength(1);
    expect(parseRow(validRow({ 1: "Outra marca" }), 2, 0).kind).toBe("ignored");
  });

  it("descarta promocao invalida, mantem imagem vazia e omite inativo", () => {
    const parsed = parseRow(validRow({ 4: 100, 5: "" }), 2, 0);
    expect(parsed).toMatchObject({
      kind: "accepted",
      value: { product: { price: 100 } },
      warnings: [{ line: 2, message: "preco promocional descartado" }],
    });
    if (parsed.kind === "accepted") {
      expect(parsed.value.product.promoPrice).toBeUndefined();
      expect(parsed.value.product.imageUrl).toBeUndefined();
    }

    expect(parseRow(validRow({ 6: false }), 2, 0)).toEqual({
      kind: "ignored",
      warnings: [],
    });
  });
});

describe("saida deterministica", () => {
  it("ordena por marca, ordem e linha original e fixa a ordem das chaves", () => {
    const first = parseRow(validRow({ 0: "BOT-002", 7: 2 }), 3, 1);
    const second = parseRow(validRow({ 0: "BOT-001", 7: 1 }), 2, 0);
    const third = parseRow(validRow({ 0: "EUD-001", 1: "Eudora", 7: 1 }), 4, 2);

    if (
      first.kind !== "accepted" ||
      second.kind !== "accepted" ||
      third.kind !== "accepted"
    ) {
      throw new Error("fixtures deveriam ser aceitas");
    }

    const output = serializeProducts(
      sortProducts([first.value, third.value, second.value]),
    );
    expect(output).toContain(
      "// GERADO POR scripts/build-data.ts — NÃO EDITE À MÃO",
    );
    expect(output.indexOf('"BOT-001"')).toBeLessThan(
      output.indexOf('"BOT-002"'),
    );
    expect(output.indexOf('"BOT-002"')).toBeLessThan(
      output.indexOf('"EUD-001"'),
    );
    expect(output).toContain('"id": "BOT-001"');
  });
});
