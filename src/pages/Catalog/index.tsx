import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router";

import ContactBanners from "../../components/ContactBanners";
import Container from "../../components/Container";
import EmptyState from "../../components/EmptyState";
import { useDebouncedValue } from "../../hooks/use-debounced-value";
import {
  getCatalogBySlug,
  searchProducts,
} from "../../services/catalog.service";
import NotFound from "../NotFound";
import CatalogGrid from "./CatalogGrid";
import CatalogHeader from "./CatalogHeader";

type CatalogContentProps = {
  slug: string;
};

function CatalogContent({ slug }: CatalogContentProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(
    () => searchParams.get("q") ?? "",
  );
  const debouncedSearchTerm = useDebouncedValue(searchTerm);
  const urlTerm = searchParams.get("q") ?? "";

  // A URL acompanha o termo já debounced, sem empilhar histórico. Só mexe no
  // `q`: a forma funcional preserva `utm_*`, e a guarda evita navegar à toa.
  useEffect(() => {
    const term = debouncedSearchTerm.trim();
    if (term === urlTerm) {
      return;
    }

    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        if (term) {
          next.set("q", term);
        } else {
          next.delete("q");
        }
        return next;
      },
      // Sem preventScrollReset, o ScrollRestoration subiria a página a cada termo.
      { replace: true, preventScrollReset: true },
    );
  }, [debouncedSearchTerm, urlTerm, setSearchParams]);

  const catalog = useMemo(() => getCatalogBySlug(slug), [slug]);

  const products = useMemo(
    () =>
      catalog ? searchProducts(catalog.products, debouncedSearchTerm) : [],
    [catalog, debouncedSearchTerm],
  );

  // Mesmo markup do 404.html, que a Vercel serve em /catalogo/<desconhecido>:
  // a página não troca de texto ao carregar.
  if (!catalog) {
    return <NotFound />;
  }

  const isEmptyCatalog = catalog.products.length === 0;
  const isSearching = debouncedSearchTerm.trim().length > 0;

  return (
    <Container>
      <CatalogHeader
        title={catalog.title}
        searchTerm={searchTerm}
        onSearchTermChange={setSearchTerm}
      />

      {isEmptyCatalog ? (
        <EmptyState message="Nenhum produto disponível neste catálogo no momento." />
      ) : products.length === 0 ? (
        <EmptyState
          message={
            <>
              Nenhum produto encontrado para{" "}
              <strong className="text-text">{debouncedSearchTerm}</strong>.
            </>
          }
          action={{ label: "Limpar busca", onClick: () => setSearchTerm("") }}
        />
      ) : (
        <>
          <CatalogGrid products={products} />

          <p className="mt-8 text-xs text-text-secondary">
            Exibindo <strong>{products.length}</strong>
            {isSearching ? ` de ${catalog.products.length}` : ""}{" "}
            {products.length === 1 ? "produto" : "produtos"}.
          </p>
        </>
      )}

      <ContactBanners className="mt-12 mb-16" />
    </Container>
  );
}

function Catalog() {
  const { slug = "" } = useParams<{ slug: string }>();

  return <CatalogContent key={slug} slug={slug} />;
}

export default Catalog;
