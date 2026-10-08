import { StrictMode } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { RouterProvider } from "react-router";

import { router } from "./router";
import "./index.css";

const container = document.getElementById("root")!;
const app = (
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);

// Só hidrata o HTML que foi pré-renderizado para esta URL. O 404.html é
// servido em qualquer caminho desconhecido com o markup de /404; hidratá-lo
// em /catalogo/xpto gera mismatch, e o React joga o HTML fora com erro no
// console. Nesses casos (e no dev, sem prerender) a renderização é do zero.
if (document.documentElement.dataset.prerenderPath === location.pathname) {
  hydrateRoot(container, app);
} else {
  createRoot(container).render(app);
}
