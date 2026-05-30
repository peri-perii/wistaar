import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    target: "esnext",
    minify: "esbuild",
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (
              id.includes("@supabase") ||
              id.includes("postgrest-js") ||
              id.includes("gotrue-js") ||
              id.includes("realtime-js") ||
              id.includes("storage-js") ||
              id.includes("functions-js")
            ) {
              return "supabase";
            }
            if (id.includes("framer-motion")) {
              return "framer-motion";
            }
            if (id.includes("lucide-react")) {
              return "lucide-react";
            }
            if (
              id.includes("react-router-dom") ||
              id.includes("@remix-run") ||
              id.includes("react-router")
            ) {
              return "react-router";
            }
            if (id.includes("@radix-ui")) {
              return "radix";
            }
            if (id.includes("@tanstack/react-query")) {
              return "react-query";
            }
            return "vendor";
          }
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
  },
}));

