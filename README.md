# Simulador de Préstamos y Análisis de Inversión

[![CI](https://github.com/DevBrandonArellano/Bacss_Calculadora_finanzas/actions/workflows/ci.yml/badge.svg)](https://github.com/DevBrandonArellano/Bacss_Calculadora_finanzas/actions/workflows/ci.yml)

Aplicación web para tomar decisiones financieras: simulación de préstamos (sistemas francés y alemán), abonos extraordinarios, aportes recurrentes, comparación de escenarios e inversión vs. deuda.

El núcleo es un motor matemático financiero preciso y verificable —dominio construido 100 % con TDD antes de escribir una sola línea de UI—; la interfaz es una capa de presentación desacoplada que lo consume. Todo cálculo usa `decimal.js` (nunca `number`) y cada fórmula está documentada en [`docs/especificacion-matematica.md`](docs/especificacion-matematica.md) antes de existir en código.

## Funcionalidad

- Simulación de amortización con **sistema francés** (cuota constante) y **sistema alemán** (capital constante).
- Conversión de tasa anual → mensual seleccionable (nominal o efectiva), sin valor por defecto implícito.
- **Abonos extraordinarios**: únicos (periodo + monto) o **recurrentes** (monto fijo entre un periodo inicial y final, sin cargar uno por uno), con estrategia de reducir plazo o reducir cuota.
- Dashboard con "Cuota actual": cuando hay abonos, muestra la cuota vigente (última fila del cronograma) en vez de "Variable" — útil con la estrategia "reducir cuota", donde el monto mensual cambia a lo largo del préstamo.
- **Costos opcionales** (ej. seguro obligatorio) informativos, sumados al total pagado.
- Tabla de amortización con resaltado de abonos y exportación a **CSV/XLSX**.
- **6 gráficos** (Recharts), cada uno con descripción de cómo leerlo, una conclusión calculada y tooltips con montos formateados: evolución del saldo, capital vs. intereses, ahorro por abonos, distribución de cada cuota, comparación francés vs. alemán, y **reducir plazo vs. reducir cuota** (compara la cuota mensual bajo ambas estrategias con los mismos abonos, para decidir antes de comprometerse a una).
- **Comparador de escenarios** (A/B/C/D) y sección **"¿Abonar deuda o invertir?"** con **ROI simple de la inversión**, punto de equilibrio y disclaimer de riesgo siempre visible.

## Stack

- **TypeScript** (modo `strict`)
- **React 18** + Zustand (estado)
- **Vite** (build)
- **Tailwind CSS v4** (estilos)
- **Recharts** (gráficos)
- **decimal.js** + **date-fns** (dominio)
- **exceljs** (export XLSX)
- **Vitest** + **Testing Library** (tests unitarios)
- **Playwright** + **@axe-core/playwright** (tests E2E y accesibilidad)
- **ESLint 9** (flat config) + **Prettier** (formato)

## Requisitos previos

- **Node.js 22** o superior (versión usada en CI) y npm.
- Para los tests E2E, el navegador de Playwright: `npx playwright install --with-deps chromium`.

## Instalación

```bash
git clone https://github.com/DevBrandonArellano/Bacss_Calculadora_finanzas.git
cd Bacss_Calculadora_finanzas
npm ci
npm run dev          # http://localhost:5173
```

Persistencia remota (opcional): copia `.env.example` a `.env.local` y completa `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` — ver [ADR 0013](docs/adr/0013-implementacion-persistencia-remota-supabase.md). Sin esto, la app funciona igual, solo con `localStorage`.

## Desarrollo

```bash
npm run dev           # servidor de desarrollo en http://localhost:5173
npm run build         # build optimizado para producción (incluye Content-Security-Policy)
npm run preview       # vista previa del build

npm run lint          # ESLint
npm run format        # Prettier (formatear)
npm run format:check  # Prettier (verificar)

npm run test           # Vitest (tests unitarios)
npm run test:watch     # Vitest (modo watch)
npm run test:coverage  # Vitest con reporte de cobertura
npm run test:e2e       # Playwright (E2E, incluye accesibilidad y responsive)
```

`npm run test:e2e` construye la app y la sirve con `vite preview` antes de correr los specs — reproduce el entorno de producción real (CSP incluida).

## Arquitectura

Hexagonal / limpia: dominio puro (sin React/DOM) → aplicación (casos de uso) → infraestructura (puertos) ← presentación (React). Ver [ADR 0001](docs/adr/0001-arquitectura-hexagonal.md) para el detalle y su justificación.

```
src/
├── domain/           # motor financiero puro (solo decimal.js + date-fns)
│   ├── shared/       # value objects: Money, InterestRate, Term, RoundingPolicy, errores
│   ├── loans/        # sistemas de amortización (francés/alemán) y abonos extraordinarios
│   └── investments/  # inversión, comparador de escenarios, deuda vs. inversión
├── application/      # casos de uso + puertos (Logger, Exporter, ScenarioRepository)
├── infrastructure/   # implementaciones de puertos (CSV/XLSX, logging RFC 5424, localStorage)
├── presentation/     # componentes React, gráficos y stores de Zustand
└── main.tsx          # composition root: único lugar que conoce las clases concretas
```

### Reglas de arquitectura

- El dominio **jamás** importa React, DOM, Zustand, Recharts — solo `decimal.js` y `date-fns`.
- ESLint + `eslint-plugin-boundaries` refuerzan esta regla automáticamente.
- Patrón **Strategy** en `AmortizationSystem` (francés/alemán) y `ExtraPaymentStrategy` (reducir plazo/cuota): agregar una variante no modifica código existente.
- TDD estricto: Red → Green → Refactor.

## Calidad y verificación

- **385 tests unitarios/integración** en 50 archivos (Vitest) y **8 specs E2E** (Playwright, 15 tests, incluye accesibilidad WCAG 2A/2AA con axe-core y responsive).
- Umbrales de cobertura por capa (`vitest.config.ts`): 95 % en `domain/shared`; 90 % en `domain/loans`, `domain/investments`, `application/use-cases` e `infrastructure/*`; 80 % sentencias / 75 % ramas en `presentation`.
- Invariantes del motor verificadas en cada corrida: `Σ capital = principal`, saldo final `= 0`, `Σ cuotas = principal + Σ intereses`.
- Trazabilidad completa estándar ↔ implementación ↔ test (incluidos los 14 casos de prueba de caja negra) en [`docs/matriz-trazabilidad.md`](docs/matriz-trazabilidad.md).
- **CI** (`.github/workflows/ci.yml`) corre en cada push y PR a `main`: lint, tests unitarios, build, `npm audit --audit-level=high` y E2E (con el reporte de Playwright como artifact).

## Despliegue

La app se despliega en **Vercel** como sitio estático. `vercel.json` fija el build (`npm ci` + `npm run build`, Node 22 vía `engines`, salida en `dist/`) para que sea idéntico al de CI, y define:

- **Cache**: `/assets/*` como `immutable` por un año (Vite versiona esos nombres), `index.html` con `must-revalidate` para que cada deploy sea visible de inmediato, y los assets sin hash (`favicon.svg`, `icons.svg`) con una hora.
- **Headers de seguridad**: CSP, HSTS, `X-Content-Type-Options`, `Referrer-Policy` y `Permissions-Policy`.

**Rendimiento** — el JS inicial (`index` + `react-vendor`) es de **~131 kB gzip** (~456 kB sin comprimir); incluye `@supabase/supabase-js` (ADR 0013), que sumó ~55 kB gzip al chunk `index` frente a la medición anterior a esa dependencia:

| Chunk                                                | Tamaño (gzip) | Cuándo se carga         |
| ----------------------------------------------------- | ------------- | ------------------------ |
| `index` (código de la app + `@supabase/supabase-js`) | 85 kB         | inicio                   |
| `react-vendor`                                       | 45 kB         | inicio                   |
| `charts-vendor` (Recharts)                           | 110 kB        | al calcular un préstamo  |
| `ChartsGrid` (rejilla de gráficos, `React.lazy`)     | 3 kB          | al calcular un préstamo  |
| `exceljs`                                            | 256 kB        | al exportar a XLSX       |

Medido con `npm run build`; recalcular ante cualquier cambio de dependencias para detectar regresiones.

Las dependencias estables van en chunks propios para que, entre deploys, el navegador solo vuelva a descargar el código de la app y reutilice el resto desde el cache `immutable`.

La CSP se define **una sola vez** en [`config/csp.ts`](config/csp.ts) y se aplica por dos vías: como `<meta>` en el build (lo que ejercitan los E2E) y como header HTTP en Vercel, que es donde `frame-ancestors` realmente surte efecto. `config/csp.test.ts` falla si ambas se desincronizan. Ver [ADR 0011](docs/adr/0011-despliegue-vercel-headers-y-cache.md).

No hay rewrites SPA porque la app es de una sola página sin router, ni analytics de terceros: `script-src 'self'` no admite scripts externos y no se quiso relajar.

**Supabase** ya está implementado como persistencia remota **opcional** para el Comparador de escenarios: sin las variables `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` configuradas, la app funciona igual que antes (solo `localStorage`); con ellas, las comparaciones guardadas se sincronizan a Supabase vía auth anónima (sin pantalla de login), con **fallback automático a local si el remoto no está disponible o falla** — nunca rompe la app. Ver [ADR 0012](docs/adr/0012-preparacion-persistencia-remota-supabase.md) (restricciones) y [ADR 0013](docs/adr/0013-implementacion-persistencia-remota-supabase.md) (implementación, incluido el SQL de la tabla y las políticas RLS).

**Pendiente para que funcione en producción** (trabajo de infraestructura fuera del repositorio):

1. Crear el proyecto en [supabase.com](https://supabase.com).
2. Correr el SQL de la tabla `scenarios` y sus políticas RLS — está completo en [ADR 0013 §3](docs/adr/0013-implementacion-persistencia-remota-supabase.md#3-esquema-y-rls-a-crear-manualmente-en-el-proyecto-de-supabase).
3. Configurar `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (la `anon key` del proyecto, **nunca** la `service_role`) como variables de entorno en Vercel, y localmente en `.env.local` (ver `.env.example`).

Sin estos tres pasos, la app sigue funcionando normalmente — solo con guardado local, como antes de esta ADR.

## Seguridad

- Content-Security-Policy en el build de producción y como header HTTP en Vercel ([ADR 0008](docs/adr/0008-csp-solo-en-build-produccion.md), [ADR 0011](docs/adr/0011-despliegue-vercel-headers-y-cache.md)); los E2E corren contra ese build, no contra el servidor de desarrollo.
- Sin `eval` ni `innerHTML`.
- Logging estructurado RFC 5424 con **redacción de campos sensibles** ([ADR 0006](docs/adr/0006-logging-rfc5424.md)).
- Auditoría de dependencias (`npm audit --audit-level=high`) como job de CI.
- Por defecto los datos del usuario no salen del navegador: el guardado de escenarios usa `localStorage`, sin persistencia automática ([ADR 0007](docs/adr/0007-estado-zustand-sin-persistencia-automatica.md)). Esto deja de ser cierto solo si se configura Supabase (ver Despliegue) — en ese caso las comparaciones guardadas sí se envían al proyecto de Supabase del usuario, protegidas por RLS y auth anónima ([ADR 0013](docs/adr/0013-implementacion-persistencia-remota-supabase.md)).

## Documentación

- [`docs/especificacion-matematica.md`](docs/especificacion-matematica.md) — fórmulas de cada cálculo (amortización, abonos, inversión, punto de equilibrio), con referencia al archivo fuente.
- [`docs/adr/`](docs/adr/README.md) — decisiones de arquitectura y su razonamiento.
- [`docs/matriz-trazabilidad.md`](docs/matriz-trazabilidad.md) — estándares/prácticas ↔ dónde se implementan ↔ qué test los verifica; los 14 casos de prueba base y los flujos E2E.
- [`docs/roadmap-futuro.md`](docs/roadmap-futuro.md) — puntos de extensión documentados para inflación, impuestos, TIR/VPN, periodicidad no mensual y export PDF.

### Decisiones de arquitectura (ADR)

| #                                                                   | Decisión                                                    |
| ------------------------------------------------------------------- | ----------------------------------------------------------- |
| [0001](docs/adr/0001-arquitectura-hexagonal.md)                     | Arquitectura hexagonal con dominio puro                     |
| [0002](docs/adr/0002-precision-monetaria-decimal.md)                | Precisión monetaria con decimal.js, nunca `number`          |
| [0003](docs/adr/0003-convencion-tasa-mensual.md)                    | Conversión de tasa anual → mensual parametrizable           |
| [0004](docs/adr/0004-redondeo-banker-y-ajuste-final.md)             | Redondeo banker's rounding + ajuste distribuido             |
| [0005](docs/adr/0005-abonos-mes-siguiente-y-strategy.md)            | Abonos al mes siguiente + patrón Strategy                   |
| [0006](docs/adr/0006-logging-rfc5424.md)                            | Logging estructurado RFC 5424 con redacción                 |
| [0007](docs/adr/0007-estado-zustand-sin-persistencia-automatica.md) | Zustand para estado de UI, sin persistencia automática      |
| [0008](docs/adr/0008-csp-solo-en-build-produccion.md)               | CSP inyectada solo en el build de producción                |
| [0009](docs/adr/0009-roi-simple-no-anualizado.md)                   | ROI simple total, no anualizado                             |
| [0010](docs/adr/0010-cuota-actual-y-comparacion-de-estrategias.md)  | "Cuota actual" y comparación visual de estrategias          |
| [0011](docs/adr/0011-despliegue-vercel-headers-y-cache.md)          | Despliegue en Vercel: CSP como header, cache y verificación |
| [0012](docs/adr/0012-preparacion-persistencia-remota-supabase.md)   | Preparación para persistencia remota (Supabase)             |
| [0013](docs/adr/0013-implementacion-persistencia-remota-supabase.md) | Implementación de persistencia remota (Supabase, auth anónima) |

## Estado del proyecto

Las 14 fases del `Plan de Desarrollo y Roadmap` están completas. El motor financiero (Fases 1–7) se construyó y probó al 100 % antes de escribir interfaz (Fases 10–12); Fase 13 cerró E2E, seguridad y accesibilidad; Fase 14 fue la documentación. Después del cierre formal se agregaron ROI, aportes recurrentes en la UI, "Cuota actual", el gráfico de comparación de estrategias y persistencia remota opcional del Comparador de escenarios (ver [`docs/matriz-trazabilidad.md`](docs/matriz-trazabilidad.md) §5 y [ADR 0013](docs/adr/0013-implementacion-persistencia-remota-supabase.md)). No hay un roadmap de fases activo — trabajo nuevo se documenta como ADR, no como fase.

## Aviso

El ahorro de intereses por abonos extraordinarios es **garantizado y contractual**; la ganancia proyectada de una inversión es **una estimación, no garantizada**. Esta herramienta es informativa y no constituye asesoría financiera.
