import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
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
