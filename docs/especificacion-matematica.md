# Especificación matemática — Simulador de Préstamos y Análisis de Inversión

> Documento de referencia obligatorio (sección 5 del plan de desarrollo). Ningún cálculo del dominio se implementa sin que su fórmula esté documentada aquí. Toda fórmula referencia el archivo fuente donde vive.

## 1. Convenciones y tipos base

- **Dinero:** `Money` (`src/domain/shared/money.ts`), envoltorio inmutable sobre `Decimal` de `decimal.js`. Ver [ADR 0002](adr/0002-precision-monetaria-decimal.md).
- **Tasa de interés:** `InterestRate` (`src/domain/shared/interestRate.ts`). Se ingresa siempre como **porcentaje anual** (`InterestRate.fromPercentage('12')` → fracción `0.12`). Rango válido: `[0, 1]` (0 %–100 %); fuera de rango lanza `OutOfRangeError`.
- **Plazo:** `Term` (`src/domain/shared/term.ts`). Se normaliza siempre a meses enteros. `Term.ofYears(v)` exige que `v * 12` sea un entero exacto (no admite fracciones de mes). Rango válido: `[1, 600]` meses.
- **Redondeo:** _half-to-even_ (banker's rounding) a 2 decimales en cada operación monetaria intermedia, más un ajuste final distribuido en la última fila para que la tabla cierre exacto. Ver [ADR 0004](adr/0004-redondeo-banker-y-ajuste-final.md).

## 2. Conversión de tasa anual → mensual

Dos métodos, seleccionados explícitamente por el usuario (`MonthlyConversionMethod = 'nominal' | 'effective'`, sin valor por defecto — ver [ADR 0003](adr/0003-convencion-tasa-mensual.md)):

- **Nominal:**

  ```
  i_mensual = i_anual / 12
  ```

- **Efectiva** (capitalización compuesta mensual):

  ```
  i_mensual = (1 + i_anual)^(1/12) − 1
  ```

Implementación: `InterestRate.toMonthlyNominal()` / `toMonthlyEffective()` / `toMonthly(method)`.

## 3. Sistema francés (cuota constante)

Archivo: `src/domain/loans/frenchAmortization.ts`.

Con `P` = principal, `i` = tasa mensual, `n` = número de cuotas:

- **Cuota constante** (si `i ≠ 0`):

  ```
  C = P · i / (1 − (1 + i)^(−n))
  ```

- **Caso especial `i = 0`:** división en partes iguales, `C = P / n` (evita la indeterminación `0/0` de la fórmula general).

- **Por periodo `k` (1..n), sobre saldo `B_{k−1}` (con `B_0 = P`):**

  ```
  interés_k   = round(B_{k−1} · i)
  capital_k   = C − interés_k     (última fila: capital ajustado, ver §7)
  B_k         = B_{k−1} − capital_k
  ```

- **Invariantes verificadas** (`AmortizationEngine.run`): `Σ capital_k = P`, `B_n = 0`, `Σ cuota_k = P + Σ interés_k`.

## 4. Sistema alemán (capital constante)

Archivo: `src/domain/loans/germanAmortization.ts`.

- **Capital constante** por periodo:

  ```
  A = round(P / n)
  ```

- **Por periodo `k`, sobre saldo `B_{k−1}`:**

  ```
  interés_k = round(B_{k−1} · i)
  cuota_k   = A + interés_k        (decreciente, porque interés_k decrece)
  B_k       = B_{k−1} − A
  ```

- **Tasa `0 %`:** sin caso especial — con capital constante, `i = 0` simplemente da `interés_k = 0` en todas las filas, sin indeterminación (a diferencia del sistema francés).

## 5. Abonos extraordinarios

Archivo: `src/domain/loans/extra-payments/extraPaymentSimulator.ts`. Ver [ADR 0005](adr/0005-abonos-mes-siguiente-y-strategy.md).

- **Momento de aplicación:** el abono indicado para el periodo `N` se aplica **después** de liquidar la cuota de `N`; el saldo se reduce a partir de `N+1`.
- **Capado al saldo:** si `abono > saldo_pendiente(N)`, se aplica solo `saldo_pendiente(N)` (liquidación anticipada, `earlyPayoff`), nunca saldo negativo.
- **Recalculo del tramo siguiente**, según estrategia (`ExtraPaymentStrategy.computeNextTermMonths`):
  - **Reducir plazo** (`ReduceTermStrategy`): búsqueda binaria del menor `n'` tal que la cuota del tramo nuevo no exceda la cuota anterior (`referenceInstallment`). Válida porque la cuota es monótona decreciente en `n` para ambos sistemas.
  - **Reducir cuota** (`ReducePaymentStrategy`): `n' = remainingOriginalPeriods` (plazo restante original sin cambios); la cuota baja automáticamente al recalcular sobre el saldo menor.
- **Aportes recurrentes** (`recurringContribution.ts`): se expanden a una lista de abonos individuales (`expandRecurringContribution`) entre `startPeriod` y `endPeriod`, y se fusionan con los abonos únicos sumando montos cuando coinciden en el mismo periodo (`mergeExtraPayments`).
- **Ahorro de intereses:**

  ```
  interesAhorrado = interésTotal_base − interésTotal_conAbonos
  mesesAhorrados  = n_base − n_conAbonos
  ```

  Si `interesAhorrado < 0` (matemáticamente no debería ocurrir), se lanza `InvalidInputError` como red de seguridad.

## 6. Inversión

Archivo: `src/domain/investments/investmentCalculator.ts`.

Con `A0` = monto inicial, `a` = aporte mensual, `r` = tasa mensual de rendimiento, `m` = meses:

- **Valor futuro bruto:**

  ```
  FV_inicial      = A0 · (1 + r)^m
  FV_aportes      = a · m                          si r = 0
  FV_aportes      = a · ((1 + r)^m − 1) / r         si r ≠ 0
  FV_bruto        = round(FV_inicial + FV_aportes)
  ```

- **Total aportado:** `round(A0 + a · m)`.
- **Comisión y neto tras comisión:** `netoTrasComision = round(FV_bruto · (1 − feeRate))`.
- **Impuesto sobre la ganancia** (solo si hay ganancia): `ganancia = netoTrasComision − totalAportado`; `impuesto = ganancia > 0 ? round(ganancia · taxRate) : 0`.
- **Valor futuro neto:** `FV_neto = netoTrasComision − impuesto`.
- **ROI (simple total, no anualizado):**

  ```
  ROI = (FV_neto − totalAportado) / totalAportado
  ```

  Es el retorno total sobre todo el horizonte ingresado (`m` meses), no una tasa anualizada — con aportes periódicos, anualizar de forma exacta requiere TIR/XIRR (ver `docs/roadmap-futuro.md` §3), no un simple ajuste geométrico. Si `totalAportado = 0` (sin monto inicial ni aportes), el ROI no está definido y `calculateFutureValue` devuelve `roi: null` en vez de dividir por cero.

## 6.1. Deuda vs. inversión: comparación visual de estrategias de abono

Archivos: `src/presentation/components/charts/StrategyComparisonChart.tsx` + `chartData.ts` (`toStrategyComparisonPoints`). Presentación pura, sin fórmula nueva: recalcula la misma tabla de amortización con los mismos abonos/aportes bajo `ReduceTermStrategy` y `ReducePaymentStrategy` (§5) y grafica la cuota de cada periodo lado a lado. Sirve para decidir la estrategia **antes** de comprometerse a una en el formulario — por ejemplo, para evitar terminar pagando una cuota muy baja durante muchos meses en vez de terminar el préstamo antes.

## 7. Comparador de escenarios

Archivo: `src/domain/investments/scenarioComparator.ts`. Ejecuta `runAmortization` para cada escenario y calcula `interestSavedVsBaseline = interésTotal_primerEscenario − interésTotal_escenario` (el primer escenario de la lista es el baseline; no hay una noción de "escenario base" distinta en el dominio, es simplemente el orden en que el usuario los agregó).

## 8. Deuda vs. inversión

Archivo: `src/domain/investments/debtVsInvestmentComparator.ts`.

- **Ahorro garantizado** (abonar deuda): se simula un abono único de `availableAmount` en el periodo 1 con estrategia `ReduceTermStrategy`, y se compara el interés total resultante contra el baseline sin abonos:

  ```
  ahorroGarantizado = round(interésTotal_baseline − interésTotal_conAbono)
  ```

- **Ganancia esperada** (invertir): se corre §6 con `initialAmount = availableAmount` y `ganancia = FV_neto − totalAportado`, redondeada. El `roi` de esa misma corrida (§6) se propaga sin cambios como `investmentRoi` en el resultado.
- **Punto de equilibrio:** matemáticamente, el punto de equilibrio entre abonar e invertir ocurre cuando la tasa de rendimiento esperado de la inversión iguala la tasa del préstamo — por eso `breakEvenAnnualRate` se define exactamente como la tasa anual del préstamo (`loanAnnualRate.annualValue()`), no como un valor recalculado por separado.
- **Recomendación** (`classifyRecommendation`): `'invest'` si `gananciaEsperada > ahorroGarantizado`; `'pay-debt'` si es menor; `'equivalent'` si son iguales.
- **Disclaimer** (`INVESTMENT_DISCLAIMER`, constante exportada): se muestra siempre en la UI, incluso antes de calcular — el ahorro de intereses es **garantizado y contractual**; la ganancia de inversión es una **proyección, no garantizada**. Ver requerimiento sección 16 (caso 14) y Fase 12.

## 9. Redondeo y cierre exacto (detalle transversal)

Ver [ADR 0004](adr/0004-redondeo-banker-y-ajuste-final.md) para el mecanismo (`RoundingPolicy.roundHalfEven` + `distributeAdjustment`). Se aplica de forma idéntica en ambos sistemas de amortización, sin rama condicional por sistema.
