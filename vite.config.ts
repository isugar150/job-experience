import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";


export default defineConfig({
  plugins: [react(), tailwindcss()],
  // 기본값: /job-experience (GitHub Pages 환경)
  // 로컬 개발: VITE_BASE=/ pnpm dev
  // 다른 경로: VITE_BASE=/custom/ pnpm build
  base: process.env.VITE_BASE ?? "/job-experience/",
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
  },
  root: import.meta.dirname,
  build: {
    outDir: path.resolve(import.meta.dirname, "dist"),
    emptyOutDir: true,
  },
  server: {
    port: 3000,
    strictPort: false,
    host: true,
    allowedHosts: [
      ".manuspre.computer",
      ".manus.computer",
      ".manus-asia.computer",
      ".manuscomputer.ai",
      ".manusvm.computer",
      "localhost",
      "127.0.0.1",
    ],
    // 로컬 개발 시 /job-experience 경로 프록시
    middlewareMode: false,
  },
});
