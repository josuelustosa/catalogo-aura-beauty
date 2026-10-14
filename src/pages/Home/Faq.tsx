import Container from "../../components/Container";
import { FAQ } from "../../content/faq";
import SectionHeading from "./SectionHeading";

/** `<details>` nativo: abre e fecha sem JavaScript e sai inteiro no HTML. */
function Faq() {
  return (
    <section
      aria-labelledby="faq-title"
      className="bg-surface-soft py-[clamp(48px,5vw,72px)]"
    >
      <Container width="narrow">
        <SectionHeading
          id="faq-title"
          title="Perguntas frequentes"
          divider={false}
        />

        <div className="border-t border-divider">
          {FAQ.map((entry, index) => (
            <details
              key={entry.question}
              open={index === 0}
              className="group border-b border-divider"
            >
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 py-4.5 text-[17px] leading-6 font-semibold text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring [&::-webkit-details-marker]:hidden">
                {entry.question}
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-5 w-5 shrink-0 text-text-brand transition-transform group-open:rotate-180"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </summary>
              <p className="pr-10 pb-5 text-[15px] leading-[26px] text-text-secondary">
                {entry.answer}
              </p>
            </details>
          ))}
        </div>
      </Container>
    </section>
  );
}

export default Faq;
