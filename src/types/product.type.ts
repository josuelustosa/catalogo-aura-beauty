/**
 * Uma linha válida da Planilha Google. A planilha devolve todos os produtos;
 * o filtro por marca acontece na camada de serviço.
 */
export type Product = {
  id: string;
  /** Nome canônico do menu; o build reescreve a grafia digitada na planilha. */
  brand: string;
  title: string;
  /** Preço cheio. Aparece riscado quando há `promoPrice`. */
  price: number;
  /** Preço promocional. Quando presente, é o valor em destaque no card. */
  promoPrice?: number;
  /** Chave no manifesto de imagens gerado no build. Ausente = sem foto. */
  imageKey?: string;
  /** Indica que o produto deve aparecer na seção de destaques. */
  featured?: boolean;
};
