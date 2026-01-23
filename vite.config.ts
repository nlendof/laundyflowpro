import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: 'autoUpdate',
      // En desarrollo, deshabilitamos SW para evitar UI “fantasma” por caché mientras iteramos.
      // En producción, se mantiene PWA pero con una estrategia de actualización más agresiva.
      devOptions: {
        enabled: false,
      },
      includeAssets: ['favicon.ico', 'robots.txt'],
      manifest: {
        name: 'Luis Cap Lavandería',
        short_name: 'Luis Cap',
        description: 'Sistema de gestión integral para Luis Cap Lavandería',
        theme_color: '#3b82f6',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5 MB limit
        // Importante: evitar cachear HTML para que el shell (index.html) siempre venga fresco.
        // Esto reduce casos donde el usuario abre la app y ve una versión anterior.
        globPatterns: ['**/*.{js,css,ico,png,svg,woff2}'],
        // Consistencia > offline: NO servir navegaciones desde precache.
        // Esto evita que el Service Worker devuelva un index.html viejo (ni siquiera con Ctrl+Shift+R).
        navigateFallbackDenylist: [/./],
        // Evita que queden caches viejos activos y reduce el “a veces veo versión anterior”.
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            // Máxima consistencia: NO cachear respuestas del backend.
            // El cache de 24h podía devolver datos/estados antiguos.
            handler: 'NetworkOnly',
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
