export type FaqEntry = {
  question: string;
  answer: string;
};

/** Só perguntas com resposta confirmada pela consultora. */
export const FAQ: readonly FaqEntry[] = [
  {
    question: "Como faço um pedido?",
    answer:
      "Escolha o produto no catálogo e toque em Comprar agora. A conversa abre no WhatsApp com o nome do produto, e a consultora confirma disponibilidade, pagamento e entrega.",
  },
  {
    question: "Os produtos são originais?",
    answer:
      "Sim. Todos os produtos são originais e vendidos por uma consultora autorizada de cada uma das marcas do catálogo.",
  },
  {
    question: "Quais formas de pagamento vocês aceitam?",
    answer:
      "Pix, dinheiro ou cartão de crédito por link de pagamento. A consultora combina a forma escolhida com você no WhatsApp.",
  },
  {
    question: "Em quanto tempo eu recebo?",
    answer:
      "Depende da forma de entrega: retirada na Rua Miguel Silveira (Santa Etelvina), motoboy exclusivo ou aplicativo (Uber, 99 ou InDrive). A consultora confirma o prazo com você pelo WhatsApp.",
  },
  {
    question: "Os preços do site estão atualizados?",
    answer:
      "Sim. Preços e promoções vêm da planilha da consultora e são atualizados a cada publicação do catálogo.",
  },
  {
    question: "Posso trocar um produto?",
    answer:
      "Sim, desde que o produto ainda esteja com a etiqueta. Peças de moda íntima não têm troca, por questão de higiene.",
  },
];
