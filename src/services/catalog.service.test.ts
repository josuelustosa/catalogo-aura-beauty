import { describe, expect, it } from "vitest";
import type { Product } from "../types/product.type.ts";
import {
  getCatalogBySlug,
  getFeaturedProducts,
  getProductsByBrands,
  groupByBrand,
  maxDiscountPercent,
  searchProducts,
} from "./catalog.service.ts";

const product = (id: string, brand: string, title: string): Product => ({
  id,
  brand,
  title,
  price: 10,
});

describe("catalog.service", () => {
  it("filtra marcas sem considerar acentos nem espacos", () => {
    const withAccent = getProductsByBrands(["Boticário"]);
    expect(withAccent).not.toHaveLength(0);
    expect(getProductsByBrands(["Boticario"])).toEqual(withAccent);
    expect(getProductsByBrands([" boticário "])).toEqual(withAccent);
    for (const item of withAccent) {
      expect(item.brand).toBe("Boticário");
    }
  });

  it("busca por titulo sem considerar acentos", () => {
    const products = [
      product("1", "Eudora", "Sérum Facial Antissinais 30ml"),
      product("2", "Eudora", "Base Líquida Alta Cobertura 30ml"),
    ];
    expect(searchProducts(products, "serum")).toEqual([products[0]]);
    expect(searchProducts(products, "SÉRUM")).toEqual([products[0]]);
    expect(searchProducts(products, "termo inexistente")).toHaveLength(0);
  });

  it("busca por marca e devolve tudo com termo vazio", () => {
    const products = [
      product("1", "Boticário", "Malbec 100ml"),
      product("2", "Eudora", "Base 30ml"),
    ];
    expect(searchProducts(products, "boticario")).toEqual([products[0]]);
    expect(searchProducts(products, "  ")).toEqual(products);
  });

  it("agrupa preservando a primeira aparicao", () => {
    const groups = groupByBrand([
      product("1", "Eudora", "Base"),
      product("2", "Boticário", "Malbec"),
      product("3", "eudora", "Sérum"),
    ]);

    expect(groups.map((group) => group.brand)).toEqual(["Eudora", "Boticário"]);
    expect(groups[0].products.map((item) => item.id)).toEqual(["1", "3"]);
  });

  it("devolve so os destaques, na ordem da planilha", () => {
    const featured = getFeaturedProducts();

    expect(featured.map((item) => item.title)).toEqual([
      "Malbec Desodorante Colônia 100ml",
      "Kit Presente Hidratação Tododia 3 itens",
      "Colar Ponto de Luz Folheado a Ouro",
      "Perfume OUI Vanille Eau de Parfum 75ml",
    ]);
  });

  it("retorna null para slug inexistente", () => {
    expect(getCatalogBySlug("nao-existe")).toBeNull();
  });

  it("calcula o maior desconto dos produtos, arredondado", () => {
    const base = product("1", "Natura", "Hidratante");

    expect(maxDiscountPercent([])).toBe(0);
    expect(maxDiscountPercent([base])).toBe(0);
    expect(
      maxDiscountPercent([
        { ...base, price: 189.5, promoPrice: 149.5 },
        { ...base, price: 100, promoPrice: 90 },
      ]),
    ).toBe(21);
  });
});
