# Roadmap de futuros — ganchos de extensión (sección 17)

> Este documento describe **dónde y cómo** se conectaría cada función futura a la arquitectura existente. Deliberadamente no incluye implementación: construir estas piezas antes de que exista un requerimiento concreto violaría el principio de no diseñar para necesidades hipotéticas. Lo que sí deja este documento es la ruta de menor fricción para cuando esa necesidad aparezca, aprovechando que la arquitectura hexagonal (ADR 0001) y el patrón Strategy (ADR 0005) ya hacen extensible el motor sin tocar código existente.

## 1. Inflación

**Qué cambiaría:** ajustar el valor futuro de una inversión o el poder adquisitivo de un ahorro de intereses a moneda constante.

**Dónde engancha:** `src/domain/investments/investmentCalculator.ts`. `InvestmentInput` ya tiene la forma de un objeto de parámetros opcionales (`taxRate?`, `feeRate?`); un campo `inflationRate?: Decimal` seguiría el mismo patrón, aplicado como un factor de descuento adicional sobre `futureValueNet` (`FV_real = FV_neto / (1 + inflación)^m`), análogo a como hoy se aplica `feeRate`. No requiere tocar `AmortizationSystem` ni el motor de préstamos — la inflación es un concepto de la rama de inversión, no de amortización de deuda.

**Test que ya existe como referencia de patrón:** `investmentCalculator.test.ts` (casos con `taxRate`/`feeRate` opcionales muestran la forma esperada para un nuevo parámetro opcional).

## 2. Impuestos (modelo más completo)

**Qué cambiaría:** hoy `taxRate` en `InvestmentInput` es una tasa plana sobre la ganancia. Un modelo más realista tendría tramos progresivos, retenciones, o impuestos sobre la cuota del préstamo (ej. IVA sobre comisiones).

**Dónde engancha:** el propio `calculateFutureValue` (`investmentCalculator.ts`) ya aísla el cálculo de impuesto en un paso (`tax = gain.isPositive() ? gain.multiply(taxRate).round() : Money.zero(currency)`). Un modelo progresivo reemplazaría esa única línea por una función `calculateProgressiveTax(gain, brackets)` inyectada o parametrizada, sin cambiar la firma pública de `calculateFutureValue`. Para impuestos sobre el préstamo (ej. costos opcionales de Fase 10), el punto de extensión natural es el campo `optionalCosts` ya expuesto en `loanStore`/`Dashboard` — hoy es puramente informativo (se suma a `totalPaid` para mostrarlo), y podría evolucionar a un objeto `{ label, amount, appliesToInstallment }` si se necesitara que afecte el cálculo real en vez de ser solo un dato de reporte.

## 3. TIR / VPN (IRR / NPV)

> No confundir con el **ROI simple** ya implementado (`InvestmentResult.roi`, [ADR 0009](adr/0009-roi-simple-no-anualizado.md)): ese es el retorno total sobre todo el horizonte, sin anualizar. TIR/VPN es lo que faltaría para anualizar de forma exacta con aportes periódicos irregulares, o para comparar flujos de caja de forma/tiempos distintos.

**Qué cambiaría:** dado un flujo de caja (aportes/retiros en distintos periodos), calcular la Tasa Interna de Retorno y el Valor Presente Neto — típicamente para comparar el préstamo con abonos irregulares contra una inversión con flujos igualmente irregulares.

**Dónde engancha:** un nuevo módulo `src/domain/investments/cashFlowAnalyzer.ts` (nombre tentativo), con la misma forma que `investmentCalculator.ts`: funciones puras que reciben un array de `{ period: number; amount: Money }` (el mismo shape que `ExtraPayment`, reutilizable) y devuelven `Decimal` (TIR, vía búsqueda de raíz — Newton-Raphson o bisección, similar en espíritu a la búsqueda binaria ya usada en `ReduceTermStrategy.computeNextTermMonths`) o `Money` (VPN, descuento simple de cada flujo). No depende de ningún cambio en `AmortizationSystem`; consumiría el `schedule` que ya produce cualquier `AmortizationResult`/`ExtraPaymentComparison` como fuente de flujos.

## 4. Periodicidad no mensual (quincenal, trimestral, anual)

**Qué cambiaría:** hoy todo el motor asume periodos mensuales de forma implícita (`addMonths` en `frenchAmortization.ts`/`germanAmortization.ts`, `toMonthly()` en `InterestRate`).

**Dónde engancha (el cambio más invasivo de esta lista):**

- `Term` tendría que exponer una unidad de periodo además de la cantidad (`Term.of(value, unit: 'weeks' | 'months' | 'quarters' | 'years')`), en vez de normalizar siempre a meses.
- `InterestRate.toMonthly()` se generalizaría a `toPeriodRate(periodsPerYear: number)`, con `toMonthly` como caso particular (`periodsPerYear = 12`) para no romper el código existente.
- `FrenchAmortization`/`GermanAmortization` reemplazarían `addMonths(startDate, periodNumber)` por una función de avance de fecha parametrizada por unidad (`date-fns` ya expone `addWeeks`, `addQuarters`, `addYears` con la misma firma).
- El patrón Strategy de `AmortizationSystem` no cambia — ambos sistemas seguirían implementando la misma interfaz, solo con `AmortizationInput` llevando una unidad de periodo en vez de asumir "mes".

Es el ítem de mayor riesgo de esta lista porque toca la superficie más probada del proyecto (Fases 1–4); ameritaría su propio ciclo TDD completo, no un parche incremental.

## 5. Exportación a PDF

**Qué cambiaría:** agregar un tercer formato de exportación de la tabla de amortización, junto a CSV y XLSX.

**Dónde engancha:** el puerto `Exporter<T>` (`src/application/ports/exporter.ts`) ya está diseñado para esto — es la razón de que exista como interfaz genérica en vez de acoplar `AmortizationTable` directamente a `CsvExporter`/`XlsxExporter`. Un `PdfExporter implements Exporter<ScheduleRows>` en `src/infrastructure/export/pdfExporter.ts` (usando `jsPDF`, ya contemplado en la sección de stack del plan original) seguiría exactamente el mismo patrón que `CsvExporter`/`XlsxExporter`: detecta filas avanzadas vía `'extraPayment' in row`, genera el documento, y se registra en `src/presentation/state/exporterRegistry.ts` (`setPdfExporter`) más un botón adicional en `AmortizationTable.tsx` junto a los de CSV/XLSX ya existentes. El _composition root_ (`main.tsx`) sería el único archivo que necesita conocer la clase concreta nueva.

## Principio general para cualquier extensión futura

Todas las extensiones anteriores comparten una restricción no negociable: si tocan `src/domain/`, la nueva pieza solo puede depender de `decimal.js` y `date-fns` (regla reforzada por `eslint-plugin-boundaries`, [ADR 0001](adr/0001-arquitectura-hexagonal.md)), debe seguir TDD estricto (Red-Green-Refactor), y debe mantener la invariante de cierre exacto del saldo (`RoundingPolicy.distributeAdjustment`, [ADR 0004](adr/0004-redondeo-banker-y-ajuste-final.md)) si genera un nuevo tipo de schedule.
