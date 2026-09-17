import { Link } from "react-router";

import Container from "../components/Container";
import { CATALOG_NAV_ITEMS } from "../mocks/nav-item.mock";

function CatalogHome() {
  return (
    <Container>
      <div className="my-8 border-b border-divider pb-4">
        <h1 className="font-display text-xl font-normal text-text-brand sm:text-2xl">
          Escolha um catálogo
        </h1>

        <p className="mt-1 text-sm text-text-secondary">
          Selecione um dos grupos abaixo para ver os produtos disponíveis.
        </p>
      </div>

      <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {CATALOG_NAV_ITEMS.map((item) => (
          <li key={item.id}>
            <Link
              to={item.path}
              className="flex h-full items-center justify-between gap-4 rounded-lg border border-border bg-surface p-4 shadow-sm transition-all hover:bg-surface-soft hover:shadow-md active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <span className="font-semibold text-text-brand">
                {item.label}
              </span>

              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4 shrink-0 text-text-secondary"
              >
                <path d="m9 6 6 6-6 6" />
              </svg>
            </Link>
          </li>
        ))}
      </ul>
    </Container>
  );
}

export default CatalogHome;
