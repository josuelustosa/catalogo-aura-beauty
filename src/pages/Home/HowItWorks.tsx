import type { ReactNode } from "react";

import Container from "../../components/Container";
import SectionHeading from "./SectionHeading";

type DeliveryOption = {
  label: string;
  detail: string;
  icon: string;
};

const DELIVERY_OPTIONS: readonly DeliveryOption[] = [
  {
    label: "Retirada",
    detail: "Rua Miguel Silveira, Santa Etelvina",
    icon: "M4 10v10h16V10 M3 10l1.5-6h15L21 10z M9.5 20v-5h5v5",
  },
  {
    label: "Motoboy exclusivo",
    detail: "taxa fixa por zona",
    icon: "M5.5 20a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M18.5 20a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M5.5 17l3.5-6h5.5l4 6 M14.5 11 13 7h2.5 M9 11 7.5 8.5H5",
  },
  {
    label: "Aplicativo",
    detail: "Uber, 99 ou InDrive",
    icon: "M8 3h8a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z M11 18h2",
  },
];

type Step = {
  title: string;
  image: string;
  alt: string;
  body: ReactNode;
};

const STEPS: readonly Step[] = [
  {
    title: "Escolha no catálogo",
    image: "/ilustracoes/escolha.webp",
    alt: "Cliente olhando os produtos do catálogo no celular",
    body: "Veja preços e promoções de cada marca, sem cadastro.",
  },
  {
    title: "Chame no WhatsApp",
    image: "/ilustracoes/whatsapp.webp",
    alt: "Conversa no WhatsApp com o produto escolhido e o botão Comprar agora",
    body: "Toque em Comprar agora: a conversa abre com o nome do produto e a consultora confirma o pedido.",
  },
  {
    title: "Receba do seu jeito",
    image: "/ilustracoes/entrega.webp",
    alt: "Scooter de entrega levando uma sacola da Aura Beauty até o ponto marcado no mapa",
    body: (
      <ul
        aria-label="Formas de entrega em Manaus"
        className="mt-1 flex flex-col gap-2.5"
      >
        {DELIVERY_OPTIONS.map((option) => (
          <li
            key={option.label}
            className="flex items-center gap-2.5 text-sm text-text-secondary"
          >
            <span
              aria-hidden="true"
              className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-text-brand"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
              >
                <path d={option.icon} />
              </svg>
            </span>
            <span>
              <span className="font-semibold text-text">{option.label}</span> ·{" "}
              {option.detail}
            </span>
          </li>
        ))}
      </ul>
    ),
  },
];

function HowItWorks() {
  return (
    <section
      id="como-funciona"
      aria-labelledby="como-funciona-title"
      className="bg-surface py-[clamp(48px,5vw,72px)]"
    >
      <Container>
        <SectionHeading
          id="como-funciona-title"
          title="Como funciona"
          subtitle="Do catálogo até você em três passos."
        />

        <ol className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] gap-4">
          {STEPS.map((step, index) => (
            <li
              key={step.title}
              className="flex flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-sm"
            >
              <div className="flex h-[clamp(200px,20vw,260px)] items-end justify-center bg-surface-soft px-4 pt-4">
                <img
                  src={step.image}
                  alt={step.alt}
                  width={562}
                  height={700}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-auto max-w-full object-contain"
                />
              </div>
              <div className="flex flex-1 flex-col gap-1 px-6 pt-5 pb-6">
                <span className="text-xs font-semibold tracking-[0.08em] text-text-brand uppercase">
                  Passo {index + 1}
                </span>
                <h3 className="text-lg leading-[26px] font-bold text-text">
                  {step.title}
                </h3>
                {typeof step.body === "string" ? (
                  <p className="text-[15px] leading-[22px] text-text-secondary">
                    {step.body}
                  </p>
                ) : (
                  step.body
                )}
              </div>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}

export default HowItWorks;
