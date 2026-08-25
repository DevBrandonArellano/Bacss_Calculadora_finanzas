# ADR 0012 — Preparación para persistencia remota (Supabase), sin implementarla

## Estado

Aceptado. Documenta una decisión de **no** construir todavía.

## Contexto

El despliegue se hace en Vercel con Supabase como base de datos prevista. La tentación natural es dejar "ya listo" un `SupabaseScenarioRepository` aunque nadie lo use.

El estado real del proyecto desaconseja eso:

- El puerto `ScenarioRepository` (`src/application/ports/scenarioRepository.ts`) existe y tiene una implementación, `LocalStorageScenarioRepository`, **que no está conectada a la aplicación**: ningún store ni componente la instancia. El comparador de escenarios mantiene todo en memoria de Zustand.
- Es decir, guardar escenarios no es hoy una funcionalidad del producto. Cambiar de backend de persistencia no es el trabajo pendiente; **construir la funcionalidad de persistencia** lo es, y eso incluye decisiones de producto que no están tomadas (¿hay cuentas?, ¿qué se guarda?, ¿qué pasa con los datos al cerrar sesión?).

Escribir hoy un adaptador de Supabase sería código muerto adicional, con el agravante de que fijaría decisiones de esquema y de auth antes de que existan los requerimientos — exactamente lo que `docs/roadmap-futuro.md` establece como principio a evitar.

## Decisión

No se implementa Supabase. Se documentan las tres restricciones que condicionarán ese trabajo cuando llegue, porque no son obvias y descubrirlas tarde cuesta caro:

1. **El puerto tendrá que volverse asíncrono.** Hoy es síncrono (`save(id, scenario): void`, `findById(id): unknown`), una firma que solo tiene sentido con `localStorage`. Supabase es asíncrono de punta a punta, así que la interfaz pasará a devolver `Promise`, y eso se propaga a `scenarioStore` y a los componentes que lo consuman (estados de carga y de error que hoy no existen). Es un refactor con tests, no un cambio de una línea.

2. **Las variables `VITE_*` se empaquetan en el bundle y son públicas.** Cualquiera puede leerlas desde el navegador. Ahí solo puede ir la `anon key`, y únicamente con Row Level Security activada en todas las tablas. La `service_role` key **nunca** puede ser una variable `VITE_*`: si se necesita una operación privilegiada, va en una función serverless, no en el cliente.

3. **La CSP tendrá que abrirse a Supabase.** `connect-src 'self'` bloquea las llamadas al proyecto de Supabase; hará falta añadir `https://<proyecto>.supabase.co`. Gracias a [ADR 0011](0011-despliegue-vercel-headers-y-cache.md) basta con cambiar `config/csp.ts` y `vercel.json`, y el test de sincronización obliga a no olvidar ninguno de los dos.

## Consecuencias

- La app sigue siendo 100 % cliente: no envía datos a ningún servidor, lo que hoy es una propiedad de privacidad real y no un accidente.
- El día que se implemente, el punto de entrada es un `SupabaseScenarioRepository implements ScenarioRepository` en `src/infrastructure/persistence/`, registrado en el composition root (`main.tsx`), sin que dominio ni aplicación se enteren del cambio — que es justamente para lo que existe el puerto ([ADR 0001](0001-arquitectura-hexagonal.md)).
- Antes de eso hay que decidir el modelo de producto (cuentas sí/no, qué se persiste), y ese trabajo merece su propio ciclo de diseño.
