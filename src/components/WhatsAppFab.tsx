import { buildWhatsAppLink } from "../utils/whatsapp";
import WhatsAppIcon from "./icons/WhatsAppIcon";

/** Fixo e fora do fluxo: não desloca layout (CLS zero). */
function WhatsAppFab() {
  return (
    <a
      href={buildWhatsAppLink()}
      target="_blank"
      rel="noreferrer"
      aria-label="Falar com a Aura Beauty no WhatsApp"
      className="fixed right-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-40 flex size-14 items-center justify-center rounded-full bg-primary text-text-inverse shadow-lg transition-all hover:bg-primary-hover active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <WhatsAppIcon className="h-7 w-7" />
    </a>
  );
}

export default WhatsAppFab;
