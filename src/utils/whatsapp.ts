/**
 * Número da consultora, em formato internacional apenas com dígitos
 * (ex.: 5511999999999). Definido em `.env` como VITE_WHATSAPP_NUMBER.
 * Sem o número, o link abre o WhatsApp com a mensagem pronta e deixa o
 * contato a ser escolhido.
 */
export const WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER ?? "";

export function buildWhatsAppLink(productTitle: string): string {
  const text = encodeURIComponent(
    `Olá! Tenho interesse neste produto do catálogo: ${productTitle}`,
  );

  return `https://wa.me/${WHATSAPP_NUMBER}?text=${text}`;
}
