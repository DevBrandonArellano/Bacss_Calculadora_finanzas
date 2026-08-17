# ADR 0003 — Conversión de tasa anual → mensual parametrizable (nominal vs. efectiva)

## Estado

Aceptado (Fase 2). Punto pendiente del documento original, cerrado en la implementación.

## Contexto

El usuario ingresa la tasa **siempre en términos anuales**, pero el motor calcula cuota a cuota en base mensual. Existen dos convenciones matemáticas legítimas y ampliamente usadas para bajar una tasa anual a mensual, y no son intercambiables:

- **Nominal:** `i_mensual = i_anual / 12` (simple, común en contratos que cotizan "tasa nominal anual").
- **Efectiva:** `i_mensual = (1 + i_anual)^(1/12) − 1` (matemáticamente consistente con capitalización compuesta mensual).

Elegir una sola de forma fija habría sido incorrecto: distintos productos financieros reales usan una u otra, y el documento de requerimientos exigía dejarlo "parametrizado y documentado" en lugar de decidido unilateralmente por el equipo de desarrollo.

## Decisión

`InterestRate` (`src/domain/shared/interestRate.ts`) expone ambos métodos de conversión (`toMonthlyNominal()`, `toMonthlyEffective()`) y un método unificado `toMonthly(method: MonthlyConversionMethod)` donde `MonthlyConversionMethod = 'nominal' | 'effective'`. La elección **no tiene un valor por defecto implícito en el dominio**: todo caso de uso que arma un `AmortizationRequest` debe indicar explícitamente `rateConversionMethod`. En la UI (`LoanForm`, `ScenarioComparator`, `DebtVsInvestmentPanel`), el campo empieza vacío (`''`) y el cálculo se bloquea con un mensaje de error hasta que el usuario elige un método — evita que alguien asuma silenciosamente "nominal" cuando en realidad quería "efectiva" (o viceversa), lo cual cambiaría el resultado en varios puntos porcentuales sobre el plazo del préstamo.

## Consecuencias

- Cada test del motor de amortización (Fases 2–3) que verifica el schedule francés/alemán debe especificar el método de conversión usado, dejando la elección trazable en el propio test.
- La UI exige la selección explícita — un costo menor de fricción para el usuario, a cambio de eliminar una fuente de error silencioso de alto impacto.
