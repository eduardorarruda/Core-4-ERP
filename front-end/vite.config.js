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
          // subconjuntos de fonte de alfabetos que o app não usa (cirílico, grego, vietnamita) e as
          // fontes do modo de acessibilidade (Lexend, Atkinson), carregadas só quando a pessoa as escolhe
          globIgnores: [
            '**/lexend-*',
            '**/atkinson-*',
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
      rolldownOptions: {
        output: {
          // Separa bibliotecas grandes em chunks próprios: o cache do navegador sobrevive a deploys
          // que só mudam o código do app, e o que é pesado (PDF, gráficos) só baixa quando é usado.
          // Rolldown (Vite 8) leva junto as dependências de cada grupo; a prioridade decide quem fica
          // com o módulo compartilhado — React e os helpers do Vite precisam cair no react-vendor,
          // senão o chunk de gráficos/PDF vira dependência estática da página inicial.
          codeSplitting: {
            groups: [
              {
                name: 'react-vendor',
                priority: 40,
                test: /vite[\\/]preload-helper|commonjsHelpers|[\\/]node_modules[\\/](react|react-dom|scheduler|react-router|react-router-dom|cookie|set-cookie-parser|clsx|tailwind-merge|react-is|use-sync-external-store|@babel[\\/]runtime)[\\/]/,
              },
              { name: 'pdf-html2canvas', priority: 30, test: /[\\/]node_modules[\\/]html2canvas[\\/]/ },
              { name: 'pdf-canvg', priority: 30, test: /[\\/]node_modules[\\/](canvg|stackblur-canvas|rgbcolor|svg-pathdata|core-js|raf)[\\/]/ },
              { name: 'pdf-purify', priority: 30, test: /[\\/]node_modules[\\/]dompurify[\\/]/ },
              { name: 'pdf', priority: 20, test: /[\\/]node_modules[\\/](jspdf|jspdf-autotable|fflate|fast-png|iobuffer|pako)[\\/]/ },
              {
                name: 'charts',
                priority: 20,
                test: /[\\/]node_modules[\\/](recharts|recharts-scale|d3-[^\\/]+|victory-vendor|decimal\.js-light|internmap|@reduxjs|redux|reselect|immer|es-toolkit|eventemitter3|react-redux)[\\/]/,
              },
            ],
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
