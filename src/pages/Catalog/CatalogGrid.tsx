import type { Product } from "../../types/product.type";
import CatalogCard from "./CatalogCard";

type CatalogGridProps = {
  products: Product[];
};

function CatalogGrid({ products }: CatalogGridProps) {
  return (
    <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      {products.map((product, index) => (
        <li key={product.id}>
          <CatalogCard product={product} priority={index < 4} />
        </li>
      ))}
    </ul>
  );
}

export default CatalogGrid;
