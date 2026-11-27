import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react({
      jsxRuntime:    "automatic",
      jsxImportSource: "react",
      babel: { plugins: [] },
    }),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "icon.svg", "apple-touch-icon.png"],
      manifest: {
        id: "/",
        name: "ComplaintSync — Smart Campus Grievance Platform",
        short_name: "CompSync",
        description:
          "AI-powered campus grievance triage, QR spot reporting, multilingual voice intake, live SLA auto-escalation, and NAAC audit reporting.",
        theme_color: "#0B0F17",
        background_color: "#0B0F17",
        display: "standalone",
        start_url: "/",
        scope: "/",
        icons: [
          {
            src: "/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/pwa-maskable-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        globPatterns: ["**/*.{ico,png,svg,woff,woff2}"],
        navigateFallback: null,
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === "navigate",
            handler: "NetworkFirst",
            options: {
              cacheName: "pages-network-first",
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 },
              cacheableResponse: { statuses: [200] },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-cache",
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "gstatic-fonts-cache",
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  define: {
    global: "globalThis",
  },
  server: {
    host: "0.0.0.0",
    port: 3000,
    allowedHosts: true,
    proxy: {
      "/api": {
        target:      "http://localhost:3000",
        changeOrigin: true,
      },
      "/socket.io": {
        target:  "http://localhost:3000",
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