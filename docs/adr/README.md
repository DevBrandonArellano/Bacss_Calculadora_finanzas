# Registro de decisiones de arquitectura (ADR)

Decisiones significativas y su razonamiento, en orden cronológico de aparición en el roadmap. Formato breve: Estado / Contexto / Decisión / Consecuencias.

| #                                                          | Título                                                      | Fase |
| ---------------------------------------------------------- | ----------------------------------------------------------- | ---- |
| [0001](0001-arquitectura-hexagonal.md)                     | Arquitectura hexagonal con dominio puro                     | 0    |
| [0002](0002-precision-monetaria-decimal.md)                | Precisión monetaria con decimal.js, nunca `number`          | 1    |
| [0003](0003-convencion-tasa-mensual.md)                    | Conversión de tasa anual → mensual parametrizable           | 2    |
| [0004](0004-redondeo-banker-y-ajuste-final.md)             | Redondeo banker's rounding + ajuste distribuido             | 1–3  |
| [0005](0005-abonos-mes-siguiente-y-strategy.md)            | Abonos al mes siguiente + patrón Strategy                   | 4    |
| [0006](0006-logging-rfc5424.md)                            | Logging estructurado RFC 5424 con redacción                 | 8    |
| [0007](0007-estado-zustand-sin-persistencia-automatica.md) | Zustand para estado de UI, sin persistencia automática      | 10   |
| [0008](0008-csp-solo-en-build-produccion.md)               | CSP inyectada solo en el build de producción                | 13   |
| [0009](0009-roi-simple-no-anualizado.md)                   | ROI simple total, no anualizado                             | —    |
| [0010](0010-cuota-actual-y-comparacion-de-estrategias.md)  | "Cuota actual" y comparación visual de estrategias          | —    |
| [0011](0011-despliegue-vercel-headers-y-cache.md)          | Despliegue en Vercel: CSP como header, cache y verificación | —    |
| [0012](0012-preparacion-persistencia-remota-supabase.md)   | Preparación para persistencia remota (Supabase)             | —    |
| [0013](0013-implementacion-persistencia-remota-supabase.md) | Implementación de persistencia remota (Supabase, auth anónima) | —    |
