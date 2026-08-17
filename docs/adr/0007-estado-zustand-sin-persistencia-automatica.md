# ADR 0007 — Zustand para estado de UI, sin persistencia automática

## Estado

Aceptado (Fase 10).

## Contexto

La UI necesita estado compartido entre componentes (formulario de préstamo, dashboard, tabla, gráficos) sin acoplar ese estado a un framework de gestión pesado (Redux) ni reinventar Context + reducers a mano para cada store.

## Decisión

- Se usa **Zustand** (`create<T>()`) para cada dominio de estado de presentación: `loanStore`, `scenarioStore`, `investmentStore`. Cada store es independiente — no hay un store global único — porque cada uno modela un flujo de UI distinto (préstamo individual, comparador de escenarios, inversión vs. deuda) sin dependencias cruzadas entre sí.
- Los stores mantienen el **formulario como `string`** (input crudo del usuario) y solo convierten a tipos de dominio (`Money`, `InterestRate`, `Term`) en el momento de `calculate()`/`compare()`, dentro de un `try/catch` que traduce cualquier `DomainError` a un mensaje en español entendible por el usuario (`translateDomainError`, compartido entre los tres stores). Esto evita validar en cada keystroke y mantiene la UI responsiva mientras el usuario escribe.
- **Sin persistencia automática de estado de sesión** (ni `localStorage`, ni `sessionStorage` para el estado de los formularios): cada recarga de página empieza en blanco. La única persistencia real del proyecto es la explícita de `LocalStorageScenarioRepository` (puerto `ScenarioRepository`), pensada para guardar/recuperar escenarios nombrados por el usuario, no como cache silenciosa del formulario.

## Consecuencias

- Los stores son trivialmente testeables sin renderizar React: `useLoanStore.getState().calculate()` en Vitest, sin `render()` ni `act()`.
- Si en el futuro se quisiera persistir el progreso del formulario entre sesiones, sería una decisión de UX explícita y nueva (no un efecto secundario oculto de Zustand), y debería pasar por el puerto `ScenarioRepository` ya existente en vez de acoplar el store a `localStorage` directamente.
