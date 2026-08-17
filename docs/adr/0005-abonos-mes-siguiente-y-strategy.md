# ADR 0005 — Abonos aplicados al mes siguiente + patrón Strategy para su efecto

## Estado

Aceptado (Fase 4).

## Contexto

Un abono extraordinario indicado para el periodo _N_ puede interpretarse de al menos dos formas: (a) reduce el saldo _antes_ de liquidar la cuota de ese mismo periodo _N_, o (b) se liquida la cuota normal del periodo _N_ y el abono impacta recién a partir de _N+1_. Estas dos interpretaciones producen tablas de amortización distintas. Además, tras aplicar un abono, existen dos estrategias igual de válidas para reacomodar el resto del préstamo: mantener la cuota y terminar antes (reducir plazo), o mantener el plazo restante y bajar la cuota (reducir cuota).

## Decisión

1. **Momento de aplicación (decisión de negocio, no técnica):** el abono del periodo _N_ se aplica **después** de liquidar la cuota de _N_, y reduce el saldo a partir de _N+1_. Implementado en `extraPaymentSimulator.ts`: se genera el tramo firme hasta la fila del abono inclusive, se resta el abono del saldo resultante, y recién ahí arranca el siguiente tramo.
2. **Efecto del abono como patrón Strategy:** `ExtraPaymentStrategy` (`extraPaymentStrategy.ts`) define un único método, `computeNextTermMonths`, con dos implementaciones intercambiables:
   - `ReduceTermStrategy`: búsqueda binaria del menor plazo `n'` cuya primera cuota no exceda la cuota que se venía pagando (válida porque la cuota es monótona decreciente en `n`, para ambos sistemas de amortización).
   - `ReducePaymentStrategy`: mantiene fijo el plazo restante original; la cuota más baja surge automáticamente de recalcular sobre el saldo menor — no necesita lógica propia.
     Ninguna de las dos estrategias conoce si el sistema subyacente es francés o alemán: reciben `AmortizationSystem` como parámetro y delegan en él (Liskov: cualquier `AmortizationSystem` es intercambiable sin romper la estrategia).
3. **Abono ≥ saldo pendiente:** se capa (`cappedAmount`) al saldo exacto en vez de generar saldo negativo, y el préstamo termina ahí (`earlyPayoff`).

## Consecuencias

- Agregar una futura estrategia de abono (por ejemplo, "reducir cuota un X % fijo") solo implica una nueva clase que implemente `ExtraPaymentStrategy`, sin tocar `extraPaymentSimulator.ts` ni los sistemas de amortización — cumple Open/Closed.
- La decisión de "mes siguiente" está fijada en el dominio, no es configurable desde la UI. Si en el futuro se necesitara la alternativa ("mismo mes"), requeriría una nueva implementación del simulador (o un parámetro explícito), no un cambio de UI — ver `docs/roadmap-futuro.md`.
