import Container from "../../components/Container";
import ProductCard from "../../components/ProductCard";
import { getFeaturedProducts } from "../../services/catalog.service";
import SectionHeading from "./SectionHeading";

/** Some sem destaque marcado: uma caixa vazia na Home pareceria site quebrado. */
function FeaturedProducts() {
  const products = getFeaturedProducts();

  if (products.length === 0) {
    return null;
  }

  return (
    <section
      aria-labelledby="destaques-title"
      className="bg-surface py-[clamp(48px,5vw,72px)]"
    >
      <Container>
        <SectionHeading
          id="destaques-title"
          title="Destaques"
          subtitle="Seleção da consultora, de todos os catálogos."
        />

        {/* No celular, fila rolável em que o próximo card aparece; no desktop, grade. */}
        <ul className="-mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pt-1 pb-2 scrollbar-none lg:mx-0 lg:grid lg:grid-cols-4 lg:overflow-visible lg:px-0">
          {products.map((product) => (
            <li
              key={product.id}
              className="shrink-0 basis-[clamp(248px,72vw,292px)] snap-start"
            >
              <ProductCard product={product} />
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

export default FeaturedProducts;
