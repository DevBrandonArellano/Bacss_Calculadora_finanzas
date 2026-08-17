# ADR 0009 — ROI simple total, no anualizado

## Estado

Aceptado.

## Contexto

Se pidió agregar cálculo de ROI (retorno sobre la inversión) a la sección de inversión. "ROI" puede significar al menos dos cosas distintas: el retorno total acumulado sobre todo el horizonte de la inversión, o una tasa **anualizada** (tipo CAGR) que permita comparar inversiones de distinto plazo en pie de igualdad. Con aportes periódicos (no solo un monto inicial), anualizar de forma matemáticamente exacta no es un simple ajuste geométrico sobre el ROI total — requiere TIR/XIRR (tasa interna de retorno sobre flujos de caja irregulares), que es una pieza de cálculo distinta y no implementada (ver `docs/roadmap-futuro.md` §3).

## Decisión

Se implementa **ROI simple total**, confirmado explícitamente con el usuario:

```
ROI = (FV_neto − totalAportado) / totalAportado
```

sobre todo el horizonte ingerido (`months`), sin anualizar. Se expone como `Decimal` (fracción, ej. `0.083` = 8.3 %) en `InvestmentResult.roi` (`investmentCalculator.ts`) y se propaga sin cambios a `DebtVsInvestmentResult.investmentRoi` (`debtVsInvestmentComparator.ts`). Caso borde: si `totalAportado = 0` (inversión sin monto inicial ni aportes), el ROI no está definido — se devuelve `null` en vez de dividir por cero, mismo patrón que `AmortizationSummary.installment: Money | null`.

## Consecuencias

- El ROI mostrado en `DebtVsInvestmentPanel` no es comparable directamente entre escenarios con horizontes de distinta duración (un ROI del 20% en 5 años no es "mejor" que uno del 15% en 2 años sin anualizar) — la UI no hace esa comparación automáticamente, es responsabilidad del usuario interpretar el horizonte.
- Si en el futuro se necesita una tasa anualizada real, el camino correcto es implementar TIR/XIRR (roadmap §3) como una pieza nueva, no forzar una aproximación geométrica sobre el ROI simple existente.
