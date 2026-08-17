# ADR 0008 — Content-Security-Policy inyectada solo en el build de producción

## Estado

Aceptado (Fase 13).

## Contexto

ISO 27001 y el checklist de seguridad de la Fase 13 piden una Content-Security-Policy estricta. La forma más simple de añadirla a una SPA estática es un `<meta http-equiv="Content-Security-Policy">` en `index.html`. El problema: el dev server de Vite inyecta en ese mismo `index.html` un script inline (el _preamble_ de `@vitejs/plugin-react` para React Fast Refresh/HMR) que una CSP estricta (`script-src 'self'`, sin `'unsafe-inline'`) bloquearía, rompiendo `npm run dev`.

## Decisión

La CSP se inyecta mediante un plugin de Vite (`contentSecurityPolicyPlugin` en `vite.config.ts`) que usa el hook `transformIndexHtml` con `apply: 'build'` — solo se ejecuta durante `vite build`, nunca durante `vite dev`. El `index.html` fuente no contiene la meta tag; el `dist/index.html` generado sí. Como `npm run preview` (usado por Playwright en `test:e2e`) sirve el `dist/` ya compilado, la CSP real se ejerce exactamente en el entorno donde corren los E2E y en producción — el entorno de desarrollo simplemente no la necesita porque no está expuesto a usuarios finales.

Política aplicada: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'`. `style-src` incluye `'unsafe-inline'` porque Recharts asigna estilos inline vía JS a elementos SVG; el resto de directivas queda estricto porque el build de producción no tiene scripts inline (el bundle se referencia por `src` con hash) ni el proyecto usa `eval`.

## Consecuencias

- `npm run dev` no se ve afectado por la CSP (verificado: la respuesta HTML del dev server no incluye la meta tag).
- `npm run build && npm run preview` sí sirve la CSP real, y los E2E (Fase 13) corren contra ese build, validando la política contra la app real.
- Si en el futuro se despliega detrás de un servidor propio (no solo hosting estático), la CSP debería moverse a un header HTTP real (`Content-Security-Policy` en la respuesta del servidor) en vez de meta tag, que es la forma recomendada por el estándar cuando hay control del servidor.
