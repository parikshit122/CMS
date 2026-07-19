import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [
    react({
      jsxRuntime:    "automatic",
      jsxImportSource: "react",
      babel: { plugins: [] },
    }),
  ],
  define: {
    global: "globalThis",
  },
  server: {
    proxy: {
      "/api": {
        target:      "http://localhost:5000",
        changeOrigin: true,
      },
      "/socket.io": {
        target:  "http://localhost:5000",
        ws:      true,         // ← WebSocket proxy
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir:               "dist",
    sourcemap:            false,
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks: {
          "react-vendor":    ["react", "react-dom", "react-router-dom"],
          "firebase-vendor": ["firebase/app", "firebase/auth"],
          "socket-vendor":   ["socket.io-client"],
          "three-vendor":    ["three", "@react-three/fiber", "@react-three/drei"],
          "gsap-vendor":     ["gsap", "@gsap/react"]
        },
      },
    },
  },
  optimizeDeps: {
    include: ["react", "react-dom", "socket.io-client"],
  },
});