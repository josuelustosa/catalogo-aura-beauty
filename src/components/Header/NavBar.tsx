import { NavLink } from "react-router";
import { NAV_ITEMS } from "../../mocks/nav-item.mock";

const linkClassName =
  "flex min-h-11 items-center whitespace-nowrap rounded-full px-4.5 text-[15px] leading-5 transition-all active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

function NavBar() {
  return (
    <nav
      aria-label="Navegação principal"
      // Barra escondida no toque; com mouse, fina abaixo do lg, onde o trilho transborda.
      className="w-full overflow-x-auto overflow-y-hidden px-4 scrollbar-none max-lg:pointer-fine:scrollbar-thin max-lg:pointer-fine:scrollbar-thumb-accent max-lg:pointer-fine:scrollbar-track-transparent sm:px-6 lg:px-8"
    >
      {/* Trilho com as pílulas; no celular rola, no desktop fica centralizado. */}
      <ul className="mx-auto flex w-max gap-1 rounded-full border border-divider-inverse bg-surface-soft-inverse p-1">
        {NAV_ITEMS.map((item) => (
          <li key={item.id} className="shrink-0">
            <NavLink
              to={item.path}
              end={item.path === "/"}
              className={({ isActive }) =>
                [
                  linkClassName,
                  // Em alto contraste o fundo some: a borda marca a página atual.
                  isActive
                    ? "bg-accent font-semibold text-primary forced-colors:border-2 forced-colors:border-transparent"
                    : "font-medium text-accent hover:bg-hover-overlay-inverse hover:text-text-inverse",
                ].join(" ")
              }
            >
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default NavBar;
