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
        includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'robots.txt'],
        manifest: {
          name: 'Core 4',
          short_name: 'Core 4',
          id: '/',
          scope: '/',
          description: 'Gestão financeira para uso pessoal e pequenas empresas: contas, cartões, conciliação bancária e relatórios.',
          lang: 'pt-BR',
          start_url: '/',
          display: 'standalone',
          background_color: '#030A0B',
          theme_color: '#030A0B',
          categories: ['finance', 'productivity'],
          icons: [
            { src: '/pwa-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
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
          // Fora do precache: PDF (só baixa ao exportar), dependências opcionais do jsPDF e
          // subconjuntos de fonte de alfabetos que o app não usa (cirílico, grego, vietnamita)
          globIgnores: [
            '**/pdf-*.js',
            '**/pdf-html2canvas-*.js',
            '**/pdf-canvg-*.js',
            '**/pdf-purify-*.js',
            '**/*-cyrillic-*.woff2',
            '**/*-cyrillic-ext-*.woff2',
            '**/*-greek-*.woff2',
            '**/*-greek-ext-*.woff2',
            '**/*-vietnamese-*.woff2',
          ],
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
    build: {
      rollupOptions: {
        output: {
          // Separa bibliotecas grandes em chunks próprios: o cache do navegador sobrevive a
          // deploys que só mudam o código do app, e o que é pesado só baixa quando é usado.
          manualChunks(id) {
            // Helpers compartilhados (CommonJS interop, clsx…) vão para o chunk base; senão o
            // Rollup os coloca no 1º chunk manual que os usa e o index passa a puxar pdf/charts.
            if (id.includes('commonjsHelpers') || id.includes('vite/preload-helper') || /[\\/]node_modules[\\/](clsx|tailwind-merge|react-is|tiny-invariant|@babel[\\/]runtime|use-sync-external-store)[\\/]/.test(id)) {
              return 'react-vendor';
            }
            if (!id.includes('node_modules')) return undefined;
            if (/[\\/]node_modules[\\/](html2canvas)[\\/]/.test(id)) return 'pdf-html2canvas';
            if (/[\\/]node_modules[\\/](canvg|stackblur-canvas|rgbcolor|svg-pathdata|core-js|raf)[\\/]/.test(id)) return 'pdf-canvg';
            if (/[\\/]node_modules[\\/]dompurify[\\/]/.test(id)) return 'pdf-purify';
            if (/[\\/]node_modules[\\/](jspdf|jspdf-autotable|fflate|fast-png|iobuffer|pako)[\\/]/.test(id)) return 'pdf';
            if (/[\\/]node_modules[\\/](recharts|recharts-scale|d3-[^\\/]+|victory-vendor|decimal\.js-light|internmap|@reduxjs|redux|reselect|immer|es-toolkit|eventemitter3|use-sync-external-store|react-redux)[\\/]/.test(id)) return 'charts';
            if (/[\\/]node_modules[\\/](@assistant-ui|assistant-stream|assistant-cloud|react-markdown|remark-[^\\/]+|rehype-[^\\/]+|micromark[^\\/]*|mdast-[^\\/]+|hast-[^\\/]+|unist-[^\\/]+|unified|vfile[^\\/]*|zustand|nanoid|@radix-ui|property-information|space-separated-tokens|comma-separated-tokens|html-url-attributes|decode-named-character-reference|character-entities|trim-lines|ccount|devlop|bail|trough|is-plain-obj|zwitch|longest-streak|markdown-table|estree-util-is-identifier-name|style-to-js|style-to-object|inline-style-parser)[\\/]/.test(id)) return 'chat';
            if (/[\\/]node_modules[\\/](react|react-dom|scheduler|react-router|react-router-dom|cookie|set-cookie-parser)[\\/]/.test(id)) return 'react-vendor';
            return undefined;
          },
        },
      },
    },
    server: {
      allowedHosts: ['core4erp.codes', '.core4erp.codes'],
      proxy: {
        '/api': {
          target: backendUrl,
          changeOrigin: true,
          secure: false,
          // Origin/Referer seguem intactos: o OrigemRequisicaoFilter (CSRF) do backend exige
          // a origem do front (http://localhost:5173 está na allowlist local).
        },
      },
    },
  };
});
