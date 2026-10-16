import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { componentTagger } from "lovable-tagger";
import type { Connect, Plugin } from "vite";

/**
 * Landing de vendas estática (public/inicio/index.html) em /inicio.
 * Na Vercel isso é feito pelo vercel.json; aqui vale para "npm run dev" e "npm run preview".
 */
const landingInicio = (): Plugin => {
  const reescrever: Connect.NextHandleFunction = (req, _res, next) => {
    const caminho = req.url?.split("?")[0];
    if (caminho === "/inicio" || caminho === "/inicio/") req.url = "/inicio/index.html";
    next();
  };
  return {
    name: "landing-inicio",
    configureServer: (server) => void server.middlewares.use(reescrever),
    configurePreviewServer: (server) => void server.middlewares.use(reescrever),
  };
};

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), landingInicio(), mode === "development" && componentTagger()].filter(Boolean),
  build: {
    rolldownOptions: {
      output: {
        // Bibliotecas grandes em arquivos separados (melhor cache entre versões)
        codeSplitting: {
          groups: [
            { name: "supabase", test: /node_modules[\\/]@supabase[\\/]/ },
            { name: "react", test: /node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/ },
          ],
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
  },
}));
