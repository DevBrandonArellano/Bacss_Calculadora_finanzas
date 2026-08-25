import { defineConfig } from 'vite';
import type { Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { CONTENT_SECURITY_POLICY } from './config/csp.ts';

/**
 * Inyecta la CSP solo en el build de producción. El dev server de Vite
 * necesita un script inline (preamble de react-refresh) para HMR; una CSP
 * estricta en dev rompería ese script, así que se aplica únicamente en
 * `vite build` (y por lo tanto en `vite preview`, que sirve el dist/).
 *
 * En producción, Vercel envía además la misma política como header HTTP
 * (`vercel.json`), que es donde `frame-ancestors` sí tiene efecto.
 */
function contentSecurityPolicyPlugin(): Plugin {
  return {
    name: 'content-security-policy',
    apply: 'build',
    transformIndexHtml() {
      return [
        {
          tag: 'meta',
          attrs: { 'http-equiv': 'Content-Security-Policy', content: CONTENT_SECURITY_POLICY },
          injectTo: 'head-prepend',
        },
      ];
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), contentSecurityPolicyPlugin()],
  // Resolución nativa de los `paths` de tsconfig (Vite 8+), en reemplazo del
  // plugin `vite-tsconfig-paths`, que quedó obsoleto por esta opción.
  resolve: { tsconfigPaths: true },
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          // Separar las dependencias que casi nunca cambian del código de la
          // app, que cambia en cada deploy. Como Vercel sirve /assets con
          // `immutable` (ADR 0011), al publicar una versión nueva el navegador
          // solo vuelve a descargar el chunk de la app: react y los gráficos
          // siguen en cache con su hash anterior.
          groups: [
            { name: 'react-vendor', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/ },
            {
              name: 'charts-vendor',
              test: /node_modules[\\/](recharts|d3-.*|victory-vendor|internmap|decimal\.js-light)[\\/]/,
            },
          ],
        },
      },
    },
  },
});
