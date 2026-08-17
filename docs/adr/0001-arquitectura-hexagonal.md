# ADR 0001 — Arquitectura hexagonal con dominio puro

## Estado

Aceptado (Fase 0).

## Contexto

La aplicación es, ante todo, un motor financiero que debe ser correcto y verificable de forma independiente de React, del DOM o de cualquier detalle de infraestructura (localStorage, exportación de archivos, logging). Necesitábamos una estructura que permitiera probar el 100% de la lógica de negocio sin montar componentes ni simular un navegador, y que impidiera que decisiones de UI (Tailwind, Recharts, Zustand) se filtraran hacia las reglas de cálculo.

## Decisión

Se adopta arquitectura hexagonal / limpia con cuatro capas y dependencias que solo apuntan hacia adentro:

```
presentación (React) → aplicación (casos de uso) → dominio (motor puro)
                                    ↑
                        infraestructura (implementa puertos)
```

- `src/domain/`: solo puede importar `decimal.js` y `date-fns`. Ninguna otra dependencia, nunca React/DOM.
- `src/application/`: casos de uso que orquestan el dominio y dependen de **puertos** (`Logger`, `ScenarioRepository`, `Exporter`), nunca de implementaciones concretas.
- `src/infrastructure/`: implementaciones concretas de los puertos (`Rfc5424Logger`, `LocalStorageScenarioRepository`, `CsvExporter`, `XlsxExporter`).
- `src/presentation/`: componentes React y stores de Zustand; consume casos de uso y tipos de dominio, pero nunca importa `infrastructure` directamente — la inyección ocurre en un _composition root_ único (`src/main.tsx`), que conecta las implementaciones reales a los stores vía funciones `setXxxLogger`/`setXxxExporter`.

La regla se refuerza automáticamente con `eslint-plugin-boundaries` (`eslint.config.js`), que falla el build si `domain/` importa algo fuera de lo permitido.

## Consecuencias

- El motor financiero (Fases 1–7) se construyó y probó al 100% **antes** de escribir una sola línea de UI — la interfaz consume un motor ya confiable.
- Los stores de presentación (`loanStore`, `scenarioStore`, `investmentStore`) no importan clases de `infrastructure`; usan un patrón de registro con `NoOpLogger`/`NoOpExporter` por defecto y setters inyectados desde `main.tsx`. Esto permite testear los stores con dobles de prueba sin tocar `console`, `localStorage` ni el DOM real.
- Costo: cierta indirección (puertos + casos de uso delgados que solo hacen try/catch + logging) para operaciones simples. Se acepta porque el beneficio de aislar el dominio supera el costo, dado que el dominio es la parte más crítica y con más superficie de pruebas del proyecto.
