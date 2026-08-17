# ADR 0004 — Redondeo banker's rounding + ajuste distribuido en la última cuota

## Estado

Aceptado (Fase 1–3).

## Contexto

Cada fila de una tabla de amortización requiere redondear interés y capital a 2 decimales. Con préstamos de decenas o cientos de cuotas, un sesgo de redondeo sistemático (siempre "hacia arriba", por ejemplo) se acumula y produce que la suma de capital de todas las filas **no** cierre exactamente contra el principal original — el DoD de las Fases 2–3 exige que sí cierre.

## Decisión

1. **Banker's rounding (`ROUND_HALF_EVEN`)** en cada redondeo individual (`RoundingPolicy.roundHalfEven`, sobre `Decimal.ROUND_HALF_EVEN`), no "redondeo comercial" (`ROUND_HALF_UP`). Half-to-even no elimina el error de acumulación, pero evita el sesgo direccional que sí tiene half-up.
2. **Ajuste distribuido en la última cuota** (`RoundingPolicy.distributeAdjustment`): se calcula la suma de todos los capitales ya redondeados, se compara contra el principal exacto, y la diferencia (siempre de 1–2 céntimos) se suma íntegra al capital de la **última** fila. Esto es lo que garantiza matemáticamente que `Σ principalPaid === principal` y `remainingBalance` de la última fila sea exactamente `0`.
3. Tanto `FrenchAmortization` como `GermanAmortization` aplican el mismo mecanismo (`distributeAdjustment`) sobre su respectivo array de capitales por periodo, sin lógica condicional por sistema — la corrección vive en un único lugar (`RoundingPolicy`), no duplicada.

## Consecuencias

- `AmortizationEngine.run` valida la invariante (`totalPrincipal.equals(principal)` y `remainingBalance` final en cero) y lanza `InvalidInputError` si algún sistema de amortización la rompe — es una red de seguridad, no solo una expectativa de test.
- La última cuota de un préstamo puede diferir en 1–2 céntimos de las demás (visible en `AmortizationSummary.installment`, que devuelve `null` si la cuota no es constante en todas las filas salvo la última — ver `buildSummary` en `amortizationEngine.ts`). Esto es intencional y está documentado en el código, no es un bug.
- Cualquier sistema de amortización nuevo que se agregue (ver `docs/roadmap-futuro.md`) debe reutilizar `distributeAdjustment` para mantener la misma garantía de cierre exacto.
