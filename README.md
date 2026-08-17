# Simulador de Préstamos y Análisis de Inversión

Aplicación web para tomar decisiones financieras: simulación de préstamos (sistemas francés y alemán), abonos extraordinarios, aportes recurrentes, comparación de escenarios e inversión vs. deuda. El núcleo es un motor matemático financiero preciso y verificable (dominio 100 % testeado con TDD antes de escribir una sola línea de UI); la interfaz es una capa de presentación desacoplada que lo consume.

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
- **Vitest** + **Testing Library** (tests unitarios)
- **Playwright** + **@axe-core/playwright** (tests E2E y accesibilidad)
- **ESLint 9** (flat config) + **Prettier** (formato)

## Arquitectura

Hexagonal / limpia: dominio puro (sin React/DOM) → aplicación (casos de uso) → infraestructura (puertos) ← presentación (React). Ver [ADR 0001](docs/adr/0001-arquitectura-hexagonal.md) para el detalle y su justificación.

**Capas:**

- `src/domain/` — motor financiero puro (solo `decimal.js` + `date-fns`)
- `src/application/` — casos de uso + puertos (interfaces)
- `src/infrastructure/` — implementaciones de puertos
- `src/presentation/` — componentes React y stores de Zustand

## Documentación

- [`docs/especificacion-matematica.md`](docs/especificacion-matematica.md) — fórmulas de cada cálculo (amortización, abonos, inversión, punto de equilibrio), con referencia al archivo fuente.
- [`docs/adr/`](docs/adr/README.md) — decisiones de arquitectura y su razonamiento.
- [`docs/matriz-trazabilidad.md`](docs/matriz-trazabilidad.md) — estándares/prácticas ↔ dónde se implementan ↔ qué test los verifica; los 14 casos de prueba base y los flujos E2E.
- [`docs/roadmap-futuro.md`](docs/roadmap-futuro.md) — puntos de extensión documentados para inflación, impuestos, TIR/VPN, periodicidad no mensual y export PDF.

## Desarrollo

```bash
npm run dev          # servidor de desarrollo en http://localhost:5173
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

## Fases

Las 14 fases del `Plan de Desarrollo y Roadmap` están completas. El motor financiero (Fases 1–7) se construyó y probó al 100 % antes de escribir interfaz (Fases 10–12); Fase 13 cerró E2E, seguridad y accesibilidad; Fase 14 es esta documentación. Ver [`docs/matriz-trazabilidad.md`](docs/matriz-trazabilidad.md) para el detalle de qué verifica cada test.

## Reglas de arquitectura

- El dominio **jamás** importa React, DOM, Zustand, Recharts — solo `decimal.js` y `date-fns`.
- ESLint + `eslint-plugin-boundaries` refuerzan esta regla automáticamente.
- Tests unitarios de dominio con cobertura ≥90 % (≥95 % en value objects de `domain/shared`).
- TDD estricto: Red → Green → Refactor.
