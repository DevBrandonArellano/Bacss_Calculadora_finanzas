# ADR 0006 — Logging estructurado RFC 5424 con redacción defensiva

## Estado

Aceptado (Fase 8).

## Contexto

El requerimiento exige registrar errores/eventos relevantes con niveles de severidad estándar y sin exponer datos sensibles en los logs (ISO 27001). Un `console.log` ad-hoc no da ni la estructura ni la garantía de sanitización necesarias.

## Decisión

- Puerto `Logger` (`src/application/ports/logger.ts`) con un único método `log(entry)`, donde `severity` está tipado a los 8 niveles de RFC 5424 (`emergency`, `alert`, `critical`, `error`, `warning`, `notice`, `informational`, `debug`).
- Implementación concreta `Rfc5424Logger` (`src/infrastructure/logging/rfc5424Logger.ts`): serializa `{ timestamp, severity, message, context }` a JSON y lo enruta al método de `console` correspondiente a la severidad. Antes de serializar, `sanitizeContext` reemplaza por `'[REDACTED]'` cualquier clave del contexto que matchee `/password|token|secret|key/i` — defensa en profundidad incluso si algún caller pasara accidentalmente un campo sensible.
- Todos los casos de uso de `application/use-cases/` siguen el mismo patrón: `try { ... } catch (error) { if (error instanceof DomainError) logger.log({ severity: 'error', ... }); throw error; }` — el error de dominio se loguea con contexto (`code`, `field`, nunca el objeto completo) y se relanza para que la capa de presentación lo traduzca a un mensaje de usuario.
- `presentation` nunca instancia `Rfc5424Logger` directamente: cada store (`loanStore`, `scenarioStore`, `investmentStore`) mantiene un logger módulo-privado que arranca en un `NoOpLogger`, con un setter (`setLoanStoreLogger`, etc.) que el composition root (`main.tsx`) reemplaza por la instancia real — refuerza el ADR 0001.

## Consecuencias

- Cualquier nuevo caso de uso que pueda fallar con un `DomainError` debe seguir el mismo patrón try/catch-log-rethrow para mantener consistencia de auditoría.
- Los tests de casos de uso usan un `FakeLogger` que solo acumula entradas en memoria (`entries: []`), permitiendo verificar severidad y ausencia de datos sensibles sin acoplarse a `console`.
