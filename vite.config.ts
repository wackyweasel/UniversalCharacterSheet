import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

const base = process.env.VITE_BASE_URL || '/UniversalCharacterSheet/'
const cacheSuffix = base.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'root'

// https://vitejs.dev/config/
export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: null,
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        id: `${base}?app=installed`,
        name: 'Universal Character Sheet',
        short_name: 'Character Sheet',
        description: 'Create and play with system-agnostic tabletop RPG character sheets.',
        start_url: `${base}?app=installed`,
        scope: base,
        display: 'standalone',
        background_color: '#f3f4f6',
        theme_color: '#171717',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: false,
        skipWaiting: false,
        navigateFallback: `${base}index.html`,
        ignoreURLParametersMatching: [/^app$/, /^edge-check$/, /^utm_/, /^fbclid$/],
        globPatterns: ['**/*.{js,css,html,ico,jpg,jpeg,png,svg,webp,woff,woff2}'],
        globIgnores: ['**/apple-touch-icon.png', '**/favicon.svg', '**/pwa-*.png'],
        runtimeCaching: [
          {
            urlPattern: /\/community-gallery\/.*\.json$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: `ucs-community-gallery-${cacheSuffix}`,
              networkTimeoutSeconds: 4,
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 7 * 24 * 60 * 60,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
