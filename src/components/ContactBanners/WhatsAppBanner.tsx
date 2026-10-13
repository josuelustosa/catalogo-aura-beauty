import { buildWhatsAppLink } from "../../utils/whatsapp";
import WhatsAppIcon from "../icons/WhatsAppIcon";
import BannerRose from "./BannerRose";

function WhatsAppBanner() {
  return (
    <a
      href={buildWhatsAppLink()}
      target="_blank"
      rel="noreferrer"
      aria-label="Chamar no WhatsApp: tire dúvidas e combine a entrega em Manaus"
      className="@container relative flex min-h-40 w-full items-center overflow-hidden rounded-lg bg-primary px-6 py-4.5 text-text-inverse shadow-sm transition-all hover:bg-primary-hover hover:shadow-md active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <BannerRose tone="bg-text-inverse opacity-22" />

      <span className="relative flex max-w-75 flex-col items-start gap-1">
        <span className="text-xs font-semibold tracking-[0.08em] text-accent uppercase">
          Pronta-entrega em Manaus
        </span>
        <span className="font-display text-[28px] leading-[1.1]">
          Peça pelo WhatsApp
        </span>
        <span className="text-sm text-accent">
          Tire dúvidas e combine a entrega.
        </span>
        <span className="mt-2.5 inline-flex min-h-9 items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-primary">
          <WhatsAppIcon />
          Chamar no WhatsApp
        </span>
      </span>
    </a>
  );
}

export default WhatsAppBanner;
