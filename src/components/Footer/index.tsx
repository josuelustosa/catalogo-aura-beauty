import { Link } from "react-router";

import Container from "../Container";

const BUSINESS_DESCRIPTION =
  "Perfumaria, beleza, moda íntima e acessórios à pronta-entrega em Manaus.";

function Footer() {
  return (
    <footer className="mt-auto bg-primary text-text-inverse">
      <Container>
        {/* pb-24 no celular: o botão flutuante não cobre o copyright. */}
        <div className="flex flex-col items-center gap-6 pt-10 pb-24 text-center lg:pb-7">
          <Link
            to="/"
            className="rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
          >
            <img
              src="/logo-aura-beauty.svg"
              alt="Aura Beauty, ir para o início"
              width={99}
              height={80}
              className="h-20 w-auto"
            />
          </Link>

          <div className="flex w-full flex-wrap justify-center gap-x-6 gap-y-1 border-t border-divider-inverse pt-5 text-sm leading-[22px]">
            <p>
              {/* O HTML sai com o ano do build; o próximo deploy o atualiza. */}
              ©{" "}
              <span suppressHydrationWarning>{new Date().getFullYear()}</span>{" "}
              Aura Beauty · {BUSINESS_DESCRIPTION}
            </p>
            <p className="text-accent">
              Desenvolvido por{" "}
              <a
                href="https://github.com/josuelustosa"
                target="_blank"
                rel="noreferrer"
                className="rounded-sm font-semibold underline underline-offset-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                Josué Lustosa
              </a>
            </p>
          </div>
        </div>
      </Container>
    </footer>
  );
}

export default Footer;
