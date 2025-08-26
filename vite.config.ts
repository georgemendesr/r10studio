import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
  host: true, // aceita 0.0.0.0/localhost/::
  port: 4502, // frontend na 4502 para liberar 4501 para API
  strictPort: true, // não faz fallback de porta
  open: false,
  proxy: {
    '/api': {
      target: 'http://localhost:4501',
      changeOrigin: true,
    }
  }
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
