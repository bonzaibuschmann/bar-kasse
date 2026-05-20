import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 3001,
    hmr: {
      host: true,
      port: 3001,
      protocol: "ws",
    },
    watch: {
      usePolling: true,
      interval: 100,
    },
    proxy: {
      "/api": {
        target: process.env.VITE_API_URL || "http://localhost:4001",
        changeOrigin: true,
      },
    },
  },
});
