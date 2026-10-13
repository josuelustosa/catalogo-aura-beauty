import { INSTAGRAM_URL } from "../../utils/instagram";
import InstagramBanner from "./InstagramBanner";
import WhatsAppBanner from "./WhatsAppBanner";

type ContactBannersProps = {
  className?: string;
};

/** Lado a lado no desktop, empilhados no celular; sem Instagram, fica um só. */
function ContactBanners({ className = "" }: ContactBannersProps) {
  return (
    <section
      aria-label="Fale com a Aura Beauty"
      className={`flex flex-wrap justify-center gap-x-6 gap-y-4 ${className}`}
    >
      <div className="flex max-w-120 flex-[1_1_340px]">
        <WhatsAppBanner />
      </div>
      {INSTAGRAM_URL ? (
        <div className="flex max-w-120 flex-[1_1_340px]">
          <InstagramBanner url={INSTAGRAM_URL} />
        </div>
      ) : null}
    </section>
  );
}

export default ContactBanners;
