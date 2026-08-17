# ADR 0010 — "Cuota actual" (no historial) y comparación visual de estrategias de abono

## Estado

Aceptado.

## Contexto

Dos problemas de usabilidad reportados sobre abonos extraordinarios:

1. El indicador "Cuota" del Dashboard mostraba **"Variable"** en vez de un monto cuando se usaba la estrategia "reducir cuota", porque `AmortizationSummary.installment` exige que la cuota sea constante en _toda_ la historia del cronograma (con excepción de la última fila, por el ajuste de redondeo — ver ADR 0004). Con "reducir cuota", el monto cambia entre el tramo previo y posterior al abono por diseño, así que la condición nunca se cumple y el usuario no veía la nueva cuota más baja.
2. Elegir entre "reducir plazo" y "reducir cuota" antes de tener un préstamo con abonos era una decisión a ciegas: no había forma de comparar el efecto de ambas estrategias sin recalcular manualmente cambiando el selector y volviendo a calcular dos veces.

## Decisión

1. **Cuota actual:** el Dashboard ya no usa `summary.installment` para el indicador de cuota cuando hay abonos aplicados. En su lugar, toma la cuota de la **última fila** del cronograma (`withExtraPayments.schedule.at(-1)?.installment`) — el monto que el usuario paga _hoy_, no un resumen de toda la historia. La etiqueta cambia a "Cuota actual" para dejar claro que no es constante desde el inicio del préstamo.
2. **`StrategyComparisonChart`:** nuevo gráfico que recalcula el mismo préstamo con los mismos abonos/aportes bajo `ReduceTermStrategy` y `ReducePaymentStrategy` simultáneamente (llamando al simulador de dominio dos veces, sin tocar el simulador en sí — mismo patrón que `SystemComparisonChart` para francés vs. alemán, ver Fase 11), y grafica la cuota mensual de cada estrategia lado a lado. Solo se muestra cuando el resultado activo ya tiene abonos aplicados (`result.kind === 'withExtraPayments'`).

## Consecuencias

- `loanStore` ahora expone `extraPaymentInputs: { extraPayments, recurringContributions } | null` (los abonos/aportes ya parseados desde el último `calculate()` exitoso), necesario para que `StrategyComparisonChart` pueda recalcular con las mismas entradas sin volver a leer el formulario crudo.
- El usuario puede decidir la estrategia viendo ambas curvas de cuota antes de comprometerse, en vez de alternar el selector y recalcular a ciegas.
- Este bug (Cuota actual) no lo detectaron los tests unitarios de `Dashboard.test.tsx` existentes porque solo cubrían la estrategia "reducir plazo" (donde la cuota sí resulta constante) — quedó como recordatorio de cubrir explícitamente ambas estrategias en los tests de UI que dependen de `summary.installment`.
