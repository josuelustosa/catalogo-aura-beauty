import { Link } from "react-router";

import Container from "../../components/Container";
import WhatsAppIcon from "../../components/icons/WhatsAppIcon";
import { buildWhatsAppLink } from "../../utils/whatsapp";

type ArtCard = {
  label: string;
  icon: string;
  className: string;
};

// A arte escala com o próprio container (cqw): no celular encolhe inteira.
const ART_CARDS: readonly ArtCard[] = [
  {
    label: "Perfumaria",
    icon: "M9.5 3h5v3h-5z M10.5 6v2 M13.5 6v2 M9 8h6a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3v-7a3 3 0 0 1 3-3z M9 15h6",
    className: "top-[24.35cqw] left-0 h-[46.09cqw] -rotate-8 bg-accent",
  },
  {
    label: "Moda Íntima",
    icon: "M4 4v6 M20 4v6 M4 10c0 4 2.2 7 5 7 2 0 3-1.4 3-3.2 0 1.8 1 3.2 3 3.2 2.8 0 5-3 5-7 M4 10c3.4 0 6.4 1.4 8 3.8 M20 10c-3.4 0-6.4 1.4-8 3.8",
    className: "top-[7.83cqw] right-0 h-[46.09cqw] rotate-7 bg-accent",
  },
  {
    label: "Joias & Acessórios",
    icon: "M7 4h10l4 5-9 11L3 9z M3 9h18 M10 4 8.5 9 12 20l3.5-11L14 4",
    className:
      "right-[3.48cqw] bottom-[0.87cqw] h-[38.26cqw] -rotate-4 bg-surface",
  },
];

const ctaFocus =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

function HeroArt() {
  return (
    <div
      aria-hidden="true"
      className="flex min-w-0 flex-[1_1_380px] justify-center"
    >
      <div className="@container relative aspect-[460/440] w-115 max-w-full">
        {ART_CARDS.map((card) => (
          <div
            key={card.label}
            className={`absolute flex w-[36.52cqw] flex-col items-center justify-center gap-[3.04cqw] rounded-lg border border-border p-[3.48cqw] text-center shadow-lg ${card.className}`}
          >
            <span className="flex size-[12.17cqw] items-center justify-center rounded-full border-[1.5px] border-primary text-text-brand">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-[6.09cqw]"
              >
                <path d={card.icon} />
              </svg>
            </span>
            <span className="font-display text-[3.91cqw] leading-[1.2] text-primary-hover">
              {card.label}
            </span>
          </div>
        ))}

        <div className="absolute top-[4.35cqw] left-1/2 z-10 -ml-[25.65cqw] flex h-[82.61cqw] w-[51.3cqw] flex-col items-center justify-between rounded-lg bg-primary px-[5.22cqw] pt-[10.43cqw] pb-[6.96cqw] shadow-lg">
          <span className="absolute inset-[2.17cqw] rounded-md border border-divider-inverse" />
          <img
            src="/logo-aura-beauty.svg"
            alt=""
            width={99}
            height={80}
            className="relative h-auto w-[34.78cqw]"
          />
          <span className="relative flex flex-col items-center gap-[2.17cqw] text-center">
            <span className="font-display text-[3.7cqw] leading-[1.3] text-accent">
              Beleza que realça
              <br />
              sua essência
            </span>
            <svg viewBox="0 0 24 24" className="size-[3.04cqw] fill-accent">
              <path d="M12 20s-7.5-4.6-7.5-10A4.5 4.5 0 0 1 12 7.2 4.5 4.5 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z" />
            </svg>
          </span>
        </div>
      </div>
    </div>
  );
}

function HomeHero() {
  return (
    <section
      aria-labelledby="hero-title"
      className="bg-surface-soft py-[clamp(40px,5vw,72px)]"
    >
      <Container>
        <div className="flex flex-wrap items-center justify-between gap-x-[clamp(32px,4vw,64px)] gap-y-10">
          <div className="flex max-w-155 min-w-0 flex-[1_1_460px] flex-col items-start gap-5">
            <p className="inline-flex items-center gap-2 rounded-full border border-border bg-surface py-1.5 pr-3.5 pl-2.5 text-sm font-semibold text-text-brand shadow-sm">
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4 shrink-0"
              >
                <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z M12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z" />
              </svg>
              Pronta-entrega em Manaus
            </p>

            <h1
              id="hero-title"
              className="font-display text-[clamp(36px,1.5rem+2.6vw,56px)] leading-[1.08] font-normal tracking-[-0.01em] text-text"
            >
              Perfumaria e beleza{" "}
              <span className="text-text-brand">
                à pronta-entrega em Manaus
              </span>
            </h1>

            <p className="max-w-[34em] text-[clamp(16px,0.9rem+0.35vw,18px)] leading-[1.6] text-text-secondary">
              Beleza, moda íntima, joias e acessórios em um só catálogo. Escolha
              o produto, chame a consultora no WhatsApp e receba em casa.
            </p>

            <div className="mt-1 flex w-full max-w-130 flex-wrap gap-3">
              <a
                href={buildWhatsAppLink()}
                target="_blank"
                rel="noreferrer"
                className={`inline-flex min-h-12 flex-[1_1_220px] items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-[15px] font-semibold text-text-inverse shadow-sm transition-all hover:bg-primary-hover active:scale-95 ${ctaFocus}`}
              >
                <WhatsAppIcon className="h-[18px] w-[18px]" />
                Chamar no WhatsApp
              </a>
              <Link
                to="/catalogo"
                className={`inline-flex min-h-12 flex-[1_1_220px] items-center justify-center gap-2 rounded-full border-[1.5px] border-primary bg-surface px-6 py-3 text-[15px] font-semibold text-text-brand transition-all hover:bg-surface-soft active:scale-95 ${ctaFocus}`}
              >
                Ver catálogos
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-[18px] w-[18px] shrink-0"
                >
                  <path d="M5 12h14 M13 6l6 6-6 6" />
                </svg>
              </Link>
            </div>
          </div>

          <HeroArt />
        </div>
      </Container>
    </section>
  );
}

export default HomeHero;
