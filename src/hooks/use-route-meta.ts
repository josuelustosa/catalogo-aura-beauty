import { useEffect } from "react";
import { useLocation } from "react-router";

import { getRouteMeta } from "../seo/route-meta";

function headElement<T extends HTMLElement>(
  selector: string,
  create: () => T,
): T {
  const existing = document.head.querySelector<T>(selector);
  if (existing) {
    return existing;
  }

  const element = create();
  document.head.append(element);
  return element;
}

/**
 * O <head> chega pronto do prerender; na navegação pelo menu ele ficaria
 * congelado na rota de entrada. Muta os nós existentes num efeito, em vez do
 * hoisting de <title> do React 19, que anexaria um segundo <title>. Efeito
 * não roda no prerender, então não há superfície de mismatch.
 */
export function useRouteMeta(): void {
  const { pathname } = useLocation();

  useEffect(() => {
    const url = document.documentElement.dataset.siteUrl ?? location.origin;
    const meta = getRouteMeta(pathname, { url, indexable: false });

    document.title = meta.title;
    headElement('meta[name="description"]', () => {
      const element = document.createElement("meta");
      element.name = "description";
      return element;
    }).content = meta.description;

    const canonical = document.head.querySelector('link[rel="canonical"]');
    if (meta.canonical) {
      headElement<HTMLLinkElement>('link[rel="canonical"]', () => {
        const element = document.createElement("link");
        element.rel = "canonical";
        return element;
      }).href = meta.canonical;
    } else {
      canonical?.remove();
    }
  }, [pathname]);
}
