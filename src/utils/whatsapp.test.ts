import { describe, expect, it } from "vitest";
import { buildWhatsAppLink, WHATSAPP_NUMBER } from "./whatsapp";

function messageOf(link: string): string {
  return new URL(link).searchParams.get("text") ?? "";
}

describe("buildWhatsAppLink", () => {
  it("leva o nome do produto na mensagem", () => {
    const link = buildWhatsAppLink("Malbec 100ml & Cia");

    expect(link.startsWith(`https://wa.me/${WHATSAPP_NUMBER}?text=`)).toBe(
      true,
    );
    expect(messageOf(link)).toBe(
      "Olá! Tenho interesse neste produto do catálogo: Malbec 100ml & Cia",
    );
  });

  it("usa a mensagem generica sem produto", () => {
    expect(messageOf(buildWhatsAppLink())).toBe(
      "Olá! Vim pelo catálogo da Aura Beauty e quero tirar uma dúvida.",
    );
    expect(buildWhatsAppLink("")).toBe(buildWhatsAppLink());
  });
});
