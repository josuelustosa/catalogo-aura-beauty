/**
 * Representa uma linha da Planilha Google, que simula a API do catálogo.
 * A planilha devolve todos os produtos gerais; o filtro por marca acontece
 * na camada de serviço.
 */
export type Product = {
  id: string;
  /** Valor cru da planilha: "Boticário", "Eudora", "OUI", "Natura"... */
  brand: string;
  title: string;
  /** Preço cheio. Aparece riscado quando há `promoPrice`. */
  price: number;
  /** Preço promocional. Quando presente, é o valor em destaque no card. */
  promoPrice?: number;
  imageUrl?: string;
  /** Indica que o produto deve aparecer na secao de destaques. */
  featured?: boolean;
};
