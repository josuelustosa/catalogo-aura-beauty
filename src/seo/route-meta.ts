import { CATALOG_NAV_ITEMS } from "../mocks/nav-item.mock";

/** Derivado do menu: um catálogo novo vira página pré-renderizada sozinho. */
export const PRERENDER_PATHS: readonly string[] = [
  "/",
  "/catalogo",
  ...CATALOG_NAV_ITEMS.map((item) => item.path),
  "/404",
];
