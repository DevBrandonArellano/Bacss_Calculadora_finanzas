# ADR 0002 — Precisión monetaria con decimal.js, nunca `number`

## Estado

Aceptado (Fase 1).

## Contexto

`number` de JavaScript usa punto flotante binario (IEEE 754), que no puede representar exactamente la mayoría de las fracciones decimales (`0.1 + 0.2 !== 0.3`). En un simulador financiero donde el DoD exige que el saldo final cierre **exactamente en 0** tras _n_ periodos de amortización, ese error de representación es inaceptable: se acumula fila a fila y produce saldos residuales de centavos.

## Decisión

Todo monto de dinero se modela con la clase `Money` (`src/domain/shared/money.ts`), que envuelve internamente un `Decimal` de `decimal.js` (aritmética decimal arbitraria, sin error de redondeo binario). `Money` es inmutable: cada operación (`add`, `subtract`, `multiply`, `round`, …) devuelve una nueva instancia. Nunca se usa `number` nativo para representar dinero en ninguna capa — ni siquiera en `presentation`, donde los formularios manejan `string` (el input crudo del usuario) y lo convierten a `Money` recién al calcular.

Las tasas de interés (`InterestRate`) también se representan internamente como `Decimal`, no `number`, por la misma razón: una tasa anual del 12 % convertida a mensual efectiva involucra una potencia fraccionaria que debe conservar precisión.

## Consecuencias

- Cobertura de `src/domain/shared/` exigida al 95 % (branches/statements/functions/lines) en `vitest.config.ts`, dado que estos son los cimientos de todo cálculo posterior.
- Cualquier nuevo cálculo financiero que se agregue al dominio debe recibir y devolver `Money`/`Decimal`, nunca `number`, para no reintroducir el problema que esta decisión resuelve.
- `Money.toNumber()` existe únicamente como frontera de salida hacia librerías que exigen `number` (por ejemplo, Recharts para graficar series) — nunca se usa como paso intermedio de un cálculo.
