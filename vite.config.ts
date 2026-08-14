import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

const base = process.env.VITE_BASE_URL || '/UniversalCharacterSheet/'

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
        id: base,
        name: 'Universal Character Sheet',
        short_name: 'Universal Character Sheet',
        description: 'Create and play with system-agnostic tabletop RPG character sheets.',
        start_url: base,
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
        ignoreURLParametersMatching: [/^edge-check$/, /^utm_/, /^fbclid$/],
        globPatterns: ['**/*.{js,css,html,ico,jpg,jpeg,png,svg,webp,woff,woff2}'],
        globIgnores: ['**/apple-touch-icon.png', '**/favicon.svg', '**/pwa-*.png'],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
