/**
 * Número da consultora, em formato internacional apenas com dígitos
 * (ex.: 5511999999999). Definido em `.env` como VITE_WHATSAPP_NUMBER.
 * Sem o número, o link abre o WhatsApp com a mensagem pronta e deixa o
 * contato a ser escolhido.
 */
export const WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER ?? "";

const GENERIC_MESSAGE =
  "Olá! Vim pelo catálogo da Aura Beauty e quero tirar uma dúvida.";

/** Sem produto, a mensagem é genérica: botão flutuante, banners e hero. */
export function buildWhatsAppLink(productTitle?: string): string {
  const message = productTitle
    ? `Olá! Tenho interesse neste produto do catálogo: ${productTitle}`
    : GENERIC_MESSAGE;

  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}
