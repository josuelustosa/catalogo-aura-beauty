import type { CatalogSlug } from "../mocks/nav-item.mock";

export type BrandCard = {
  name: string;
  /** Logo branco sobre transparente, em public/marcas/ (400 px de largura). */
  logo: string;
  width: number;
  height: number;
  /** Cor da própria marca: identidade de terceiros, não token do tema. */
  color: string;
  catalog: CatalogSlug;
};

/** Seção Marcas da Home, na ordem do canvas. */
export const BRANDS: readonly BrandCard[] = [
  {
    name: "o Boticário",
    logo: "/marcas/boticario.webp",
    width: 400,
    height: 162,
    color: "#0b5e3f",
    catalog: "boticario-eudora-e-oui",
  },
  {
    name: "Eudora",
    logo: "/marcas/eudora.webp",
    width: 400,
    height: 242,
    color: "#3c3b97",
    catalog: "boticario-eudora-e-oui",
  },
  {
    name: "OUI",
    logo: "/marcas/oui.webp",
    width: 400,
    height: 186,
    color: "#6b1d2a",
    catalog: "boticario-eudora-e-oui",
  },
  {
    name: "Natura",
    logo: "/marcas/natura.webp",
    width: 400,
    height: 308,
    color: "#f4821f",
    catalog: "natura-e-avon",
  },
  {
    name: "Avon",
    logo: "/marcas/avon.webp",
    width: 400,
    height: 94,
    color: "#c9006c",
    catalog: "natura-e-avon",
  },
  {
    name: "Romance e Favorita",
    logo: "/marcas/romance-favorita.webp",
    width: 400,
    height: 226,
    color: "#ec268f",
    catalog: "romance-e-favorita",
  },
  {
    name: "Rommanel",
    logo: "/marcas/rommanel.webp",
    width: 400,
    height: 144,
    color: "#4c2f48",
    catalog: "joias-e-acessorios",
  },
  {
    name: "Magold",
    logo: "/marcas/magold.webp",
    width: 400,
    height: 172,
    color: "#a88e52",
    catalog: "joias-e-acessorios",
  },
];
