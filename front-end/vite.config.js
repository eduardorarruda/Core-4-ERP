import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const backendUrl = env.VITE_API_PROXY_TARGET || 'http://localhost:8080';

  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'prompt', // usuário decide atualizar — evita recarga no meio de um lançamento
        includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
        manifest: {
          name: 'Core 4 ERP',
          short_name: 'Core4',
          description: 'Gestão financeira completa: contas, cartões, investimentos e assistente IA.',
          lang: 'pt-BR',
          start_url: '/',
          display: 'standalone',
          background_color: '#0c0c0c',
          theme_color: '#0c0c0c',
          categories: ['finance', 'productivity'],
          icons: [
            { src: '/pwa-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: '/pwa-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
            { src: '/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
            { src: '/pwa-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
          shortcuts: [
            { name: 'Nova conta', url: '/contas?novo=1' },
            { name: 'Falar com a Áurea', url: '/assistente' },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,woff2}'], // precache do app shell
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/api\//],
          runtimeCaching: [
            {
              // REGRA DE SEGURANÇA: dado financeiro NUNCA vai para o Cache Storage.
              urlPattern: /^.*\/api\/.*/,
              handler: 'NetworkOnly',
            },
            {
              urlPattern: /\.(?:png|jpg|jpeg|gif|webp|avif)$/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'imagens',
                expiration: { maxEntries: 60, maxAgeSeconds: 30 * 24 * 60 * 60 },
              },
            },
          ],
        },
      }),
    ],
    server: {
      allowedHosts: ['core4erp.codes', '.core4erp.codes'],
      proxy: {
        '/api': {
          target: backendUrl,
          changeOrigin: true,
          secure: false,
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              proxyReq.removeHeader('origin');
              proxyReq.removeHeader('referer');
            });
          },
        },
      },
    },
  };
});
