// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "media",
    lib: {
      entry: "src/webview/index.tsx", // <- 이거
      name: "DKMVWebviewApp",
      formats: ["iife"],
      fileName: () => "webview.js",
    },
    rollupOptions: {
      output: { extend: true },
    },
  },
});
