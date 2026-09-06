import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? "/alhabeed/" : "/",
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/socket.io": { target: "http://127.0.0.1:3000", ws: true },
      "/api": "http://127.0.0.1:3000",
      "/health": "http://127.0.0.1:3000"
    }
  }
});
