import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { createUiDevWatchOptions } from "./src/lib/vite-watch.ts";
import { createApiProxy } from "./src/lib/vite-api-proxy.ts";
import { serviceWorkerBuildIdPlugin } from "./src/lib/vite-sw-build-id.ts";

const apiProxy = createApiProxy();

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss(), serviceWorkerBuildIdPlugin()],
  build: {
    // Vite 8 uses Oxc/Rolldown. Avoid deprecated esbuild minification
    // settings, which are ignored when Oxc is enabled.
    rolldownOptions: {
      output: {
        minify: mode === "production"
          ? { compress: { dropConsole: true, dropDebugger: true } }
          : undefined,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
      lexical: path.resolve(import.meta.dirname, "./node_modules/lexical/dist/Lexical.mjs"),
    },
  },
  server: {
    port: 5173,
    watch: createUiDevWatchOptions(process.cwd()),
    proxy: apiProxy,
  },
  preview: {
    port: 3101,
    host: "0.0.0.0",
    allowedHosts: true,
    proxy: apiProxy,
  },
}));
