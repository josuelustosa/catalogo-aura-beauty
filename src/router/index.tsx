import { createBrowserRouter } from "react-router";

import { createAppRoutes } from "./tree";

// Página aberta direto pela URL não tem key no histórico, e o ScrollRestoration
// a trata como "default": restauraria a rolagem de outra página aberta antes
// nesta aba (e ignoraria o #destaques). Mesmo ajuste do modo framework.
if (!window.history.state?.key) {
  window.history.replaceState(
    { ...window.history.state, key: Math.random().toString(36).slice(2, 10) },
    "",
  );
}

export const router = createBrowserRouter(createAppRoutes());
