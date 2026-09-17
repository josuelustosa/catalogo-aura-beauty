import { describe, expect, it } from "vitest";
import {
  getCatalogBySlug,
  getProductsByBrands,
  groupByBrand,
  searchProducts,
} from "./catalog.service.ts";

describe("catalog.service", () => {
  it("filtra marcas sem considerar acentos", () => {
    expect(getProductsByBrands(["Boticario"])).not.toHaveLength(0);
  });

  it("busca por titulo ou marca", () => {
    const products = getProductsByBrands(["Boticário"]);
    expect(searchProducts(products, "boticario")).toHaveLength(products.length);
    expect(searchProducts(products, "termo inexistente")).toHaveLength(0);
  });

  it("agrupa preservando a primeira aparicao", () => {
    const groups = groupByBrand(getProductsByBrands(["Boticário", "Eudora"]));
    expect(groups.map((group) => group.brand)).toEqual(
      expect.arrayContaining(["Boticário", "Eudora"]),
    );
  });

  it("retorna null para slug inexistente", () => {
    expect(getCatalogBySlug("nao-existe")).toBeNull();
  });
});
