import { StrictMode } from "react";
import { prerender } from "react-dom/static";
import {
  createStaticHandler,
  createStaticRouter,
  StaticRouterProvider,
  type RouteObject,
} from "react-router";

import { createAppRoutes } from "./router/tree";

export { PRERENDER_PATHS } from "./seo/route-meta";

const RENDER_TIMEOUT_MS = 10_000;

export async function renderWithRoutes(
  routes: RouteObject[],
  pathname: string,
): Promise<string> {
  const handler = createStaticHandler(routes);
  const context = await handler.query(
    new Request(new URL(pathname, "http://localhost")),
  );

  if (context instanceof Response) {
    throw new Error(
      `${pathname} respondeu com Response (HTTP ${context.status}); o prerender só grava HTML`,
    );
  }

  // Erro dentro de <Suspense> não rejeita o prerender: o HTML sairia com o
  // fallback. Por isso os erros são coletados e o render falha no fim.
  const errors: unknown[] = [];
  const router = createStaticRouter(handler.dataRoutes, context);
  const { prelude } = await prerender(
    <StrictMode>
      {/* Sem loaders, os dados de hidratação seriam um script vazio. */}
      <StaticRouterProvider router={router} context={context} hydrate={false} />
    </StrictMode>,
    {
      // Sem isso, o React tira do lugar as boundaries grandes (a grade de
      // produtos) e as revela com <script> inline: HTML fora de ordem.
      progressiveChunkSize: Number.MAX_SAFE_INTEGER,
      signal: AbortSignal.timeout(RENDER_TIMEOUT_MS),
      onError: (error) => {
        errors.push(error);
      },
    },
  );
  const html = await new Response(prelude).text();

  if (errors.length > 0) {
    throw new Error(`falha ao renderizar ${pathname}: ${String(errors[0])}`, {
      cause: errors[0],
    });
  }

  return html;
}

export function render(pathname: string): Promise<string> {
  return renderWithRoutes(createAppRoutes(), pathname);
}
