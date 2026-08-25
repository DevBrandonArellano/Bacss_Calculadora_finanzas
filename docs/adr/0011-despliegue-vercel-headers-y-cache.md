# ADR 0011 — Despliegue en Vercel: CSP duplicada como header, cache y verificación

## Estado

Aceptado.

## Contexto

La aplicación es una SPA estática que se despliega en Vercel. Eso abre dos huecos que el build por sí solo no cubre:

1. **La CSP como `<meta>` es incompleta.** [ADR 0008](0008-csp-solo-en-build-produccion.md) la inyecta como `<meta http-equiv>` en el build y ya anticipaba que, con control del servidor, debía moverse a un header HTTP. Hay una razón concreta y no cosmética: la directiva `frame-ancestors` **es ignorada** por el navegador cuando la política llega en un `<meta>`. Es decir, la protección contra _clickjacking_ que el proyecto cree tener hoy no está activa.
2. **Sin política de cache explícita**, todos los archivos se sirven igual: o se cachea de menos (se pierde el beneficio de los nombres hasheados que genera Vite) o se cachea el `index.html` y los usuarios siguen viendo el deploy anterior.

Mover la CSP al header y borrar el `<meta>` resolvería (1), pero rompería la garantía que da ADR 0008: los E2E corren contra `vite preview`, que sirve el `dist/` sin pasar por Vercel, así que dejarían de ejercitar la CSP.

## Decisión

**La CSP vive en los dos sitios, con una sola fuente de verdad y un test que impide que se desincronicen.**

- La política se define una vez en `config/csp.ts` (`CONTENT_SECURITY_POLICY`).
- `vite.config.ts` la importa y la inyecta como `<meta>` en el build (comportamiento de ADR 0008 intacto: los E2E siguen validando la app bajo la política real).
- `vercel.json` la envía además como header HTTP en producción, donde `frame-ancestors` sí se aplica. Cuando ambas están presentes, el navegador exige el cumplimiento de las dos, y al ser idénticas el resultado es el mismo.
- `vercel.json` es JSON estático y no puede importar el módulo, así que la duplicación es inevitable. Lo que no es inevitable es que se desincronice: `config/csp.test.ts` lee `vercel.json` y falla si su header no coincide exactamente con la constante.

**Cache** (`vercel.json`): `/assets/(.*)` con `max-age=31536000, immutable` — Vite versiona esos nombres, así que cada deploy produce archivos nuevos y los viejos nunca cambian de contenido. `/index.html` con `max-age=0, must-revalidate`, para que el HTML que referencia esos assets se revalide siempre y un deploy sea visible de inmediato.

**Headers adicionales**: `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer` y `Permissions-Policy` negando cámara, micrófono y geolocalización — la app no usa ninguna de esas APIs, así que negarlas no cuesta nada y reduce la superficie.

**División de chunks alineada con el cache.** El `immutable` de arriba solo rinde si los archivos que no cambian conservan su hash entre deploys. Por eso `vite.config.ts` agrupa las dependencias estables en chunks propios (`react-vendor`, `charts-vendor`) separados del código de la app: al publicar una versión nueva, el navegador vuelve a descargar el chunk de la app (~30 kB gzip) y reutiliza el resto desde cache.

**Carga diferida de lo pesado.** Dos dependencias representaban la mayor parte del JS inicial y ninguna hace falta en el primer render:

- `exceljs` (~256 kB gzip) solo se usa al exportar; se carga con `import()` dentro de `XlsxExporter.export()`, que ya era asíncrono.
- `recharts` (~110 kB gzip) solo se usa cuando hay un resultado que graficar. `ChartsPanel` conserva su interfaz y su estado vacío, pero delega la rejilla a `ChartsGrid`, cargado con `React.lazy`.

Resultado: el JS inicial pasó de **444 kB gzip a 76 kB gzip**. El coste es un `Suspense` con el texto "Cargando gráficos…" la primera vez que el usuario calcula, y que los tests de `ChartsPanel` pasaron a ser asíncronos con un timeout explícito (el `import()` dinámico no resuelve dentro del segundo que `findBy` da por defecto cuando la suite corre en paralelo).

**Sin rewrites SPA.** La aplicación es de una sola página y no usa router: no hay rutas profundas que reescribir. Añadir el rewrite `/(.*) → /index.html` habitual solo serviría para convertir un 404 legítimo en una página en blanco.

**Sin analytics.** `script-src 'self'` no admite scripts de terceros. Añadir Vercel Analytics obligaría a abrir la CSP a dominios externos y a enviar telemetría desde una herramienta financiera; se decidió no hacerlo.

## Consecuencias

- El build de Vercel replica el de CI: `installCommand: npm ci`, Node 22 vía `engines` en `package.json`. La resolución de dependencias es la misma en ambos, incluido el `overrides` de `uuid`.
- Cambiar la CSP exige tocar dos archivos. El test lo convierte en un error ruidoso en vez de una divergencia silenciosa: es el precio de que la política exista en dos capas distintas del stack.
- Los E2E siguen sin cubrir los headers HTTP reales (Playwright corre contra `vite preview`, no contra Vercel). El test de `vercel.json` cubre que el _contenido_ sea correcto; que Vercel los _envíe_ se verifica en el primer deploy con `curl -I`.
- `.vercelignore` excluye `e2e/`, `docs/`, `coverage/` y `.github/` del despliegue: no intervienen en el build y la verificación corre en GitHub Actions.
