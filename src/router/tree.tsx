import { Suspense } from "react";
import { Outlet, type RouteObject } from "react-router";

import App from "../App";
import { routes } from "./routes";

/**
 * Árvore única de rotas, usada pelo router do navegador e pelo prerender: duas
 * listas em paralelo divergiriam e virariam mismatch de hidratação.
 *
 * Sem loader nem `lazy`, o router do cliente nasce inicializado e renderiza o
 * mesmo markup do servidor. Ao adicionar qualquer um dos dois, o prerender
 * passa a precisar de `hydrate={true}` no `StaticRouterProvider`.
 */
export function createAppRoutes(): RouteObject[] {
  const wrappedRoutes = routes.map((route) => ({
    ...route,
    element: route.element ? (
      <Suspense fallback={<div>Carregando...</div>}>{route.element}</Suspense>
    ) : undefined,
  }));

  return [
    {
      element: <App />,
      children: [
        {
          path: "/",
          element: <Outlet />,
          children: wrappedRoutes,
        },
      ],
    },
  ];
}
