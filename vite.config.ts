import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig(({ isSsrBuild }) => ({
  plugins: [react(), tailwindcss()],
  // A passagem de servidor não copia public/ (fotos inclusive) e nunca
  // escreve em dist/, mesmo chamada sem --outDir.
  build: isSsrBuild ? { outDir: "dist-ssr", copyPublicDir: false } : {},
}));
