export type FaqEntry = {
  question: string;
  answer: string;
};

/**
 * Só perguntas com resposta confirmada pela consultora. Originalidade,
 * pagamento e troca entram quando houver texto (§14 do plano).
 */
export const FAQ: readonly FaqEntry[] = [
  {
    question: "Como faço um pedido?",
    answer:
      "Escolha o produto no catálogo e toque em Comprar agora. A conversa abre no WhatsApp com o nome do produto, e a consultora confirma disponibilidade, pagamento e entrega.",
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
];
