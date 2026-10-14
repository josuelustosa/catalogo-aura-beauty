import { Link } from "react-router";

import Container from "../../components/Container";
import { BRANDS } from "../../content/brands";
import SectionHeading from "./SectionHeading";

function Brands() {
  return (
    <section
      id="marcas"
      aria-labelledby="marcas-title"
      className="bg-surface-soft py-[clamp(48px,5vw,72px)]"
    >
      <Container>
        <SectionHeading
          id="marcas-title"
          title="Marcas"
          subtitle="As marcas originais que você encontra em cada catálogo."
        />

        {/* Duas colunas no celular e quatro a partir do md: as 8 marcas sempre em linhas completas. */}
        <ul className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {BRANDS.map((brand) => (
            <li key={brand.name} className="flex">
              <Link
                to={`/catalogo/${brand.catalog}`}
                // A cor é da marca, não do tema: vem do dado.
                style={{ backgroundColor: brand.color }}
                className="flex h-[clamp(88px,9vw,128px)] min-w-0 flex-1 items-center justify-center rounded-lg px-5 py-3.5 shadow-sm transition-all hover:shadow-md active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <img
                  src={brand.logo}
                  alt=""
                  width={brand.width}
                  height={brand.height}
                  loading="lazy"
                  decoding="async"
                  className="h-auto max-h-[62%] w-auto max-w-[74%] object-contain"
                />
                <span className="sr-only">{`${brand.name}, ver catálogo`}</span>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

export default Brands;
