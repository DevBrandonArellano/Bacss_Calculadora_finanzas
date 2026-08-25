# ADR 0013 — Implementación de la persistencia remota con Supabase

## Estado

Aceptado. Implementa lo que [ADR 0012](0012-preparacion-persistencia-remota-supabase.md) dejó preparado y documenta las decisiones de producto que esa ADR marcaba como pendientes.

## Contexto

ADR 0012 documentó tres restricciones técnicas para cuando este trabajo se priorizara (puerto asíncrono, `anon key` pública + RLS, CSP abierta a Supabase) pero deliberadamente no lo implementó, porque además de esas restricciones técnicas faltaban decisiones de producto: ¿hay cuentas?, ¿qué se persiste?, ¿qué pasa con los datos al cerrar sesión? Este trabajo se prioriza ahora; esta ADR responde esas preguntas en vez de dejarlas abiertas indefinidamente.

## Decisión

### 1. Qué se persiste

Solo las **comparaciones del Comparador de escenarios** (`ScenarioComparator`, filas A/B/C/D + su etiqueta): es la única funcionalidad del producto que ya usaba el concepto de "escenario" ligado a `ScenarioRepository`. Los datos de un préstamo individual o de un análisis de inversión no se guardan remotamente — no había requerimiento para eso y hacerlo hubiera sido diseñar para una necesidad hipotética.

Cada comparación guardada es un `SavedComparison { id, label, savedAt, rows }` (`src/presentation/state/scenarioStore.ts`), serializado tal cual en la columna `data` (jsonb) de Supabase — igual que ya hacía `LocalStorageScenarioRepository` con `JSON.stringify`, sin mapeo adicional.

### 2. Cuentas: no, autenticación anónima

No se construye una pantalla de login (estaba fuera del alcance pedido y es una superficie de producto que merece su propio diseño). En su lugar, `main.tsx` usa **Supabase Anonymous Auth** (`signInAnonymously()`): cada navegador obtiene un `auth.uid()` real y estable la primera vez que carga la app, sin pedir credenciales.

Esto es deliberadamente distinto de usar un id generado en el cliente (ej. UUID en `localStorage`) como clave de partición: un id client-side no es un mecanismo de autenticación — cualquiera puede leerlo o falsificarlo y consultar `service_role` o incluso `anon` sin RLS efectiva si las políticas confían en un valor que el propio cliente envía. `auth.uid()` de Supabase es verificado por el servidor en cada request; una política RLS que compara contra `auth.uid()` no se puede burlar cambiando un valor en el cliente. Es la opción mínima que sigue siendo segura de verdad.

Consecuencia aceptada: los datos son por-navegador, no por-persona — borrar el storage del navegador (donde Supabase guarda el token de la sesión anónima) pierde el vínculo con esas filas en Supabase, igual que hoy pasa con `localStorage`. Migrar de anónimo a cuenta real es un flujo nativo de Supabase (`linkIdentity`) si en el futuro se decide agregar cuentas — no requiere cambiar el esquema.

### 3. Esquema y RLS (a crear manualmente en el proyecto de Supabase)

```sql
create table public.scenarios (
  id uuid primary key,
  owner_id uuid not null references auth.users (id) default auth.uid(),
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.scenarios enable row level security;

create policy "los usuarios solo ven sus propios escenarios"
  on public.scenarios for select
  using (auth.uid() = owner_id);

create policy "los usuarios solo escriben sus propios escenarios"
  on public.scenarios for insert
  with check (auth.uid() = owner_id);

create policy "los usuarios solo actualizan sus propios escenarios"
  on public.scenarios for update
  using (auth.uid() = owner_id);

create policy "los usuarios solo eliminan sus propios escenarios"
  on public.scenarios for delete
  using (auth.uid() = owner_id);
```

Nota: `SupabaseScenarioTableClient` (`src/infrastructure/persistence/supabaseScenarioTableClient.ts`) hace `upsert` sin fijar `owner_id` explícitamente — el `default auth.uid()` de la columna lo resuelve en el servidor. Esto es intencional: el cliente nunca decide de quién son los datos, RLS + el default lo hacen.

### 4. Arquitectura del adaptador

- `ScenarioRepository` (`src/application/ports/scenarioRepository.ts`) — ahora asíncrono (`Promise`), como anticipaba la restricción 1 de ADR 0012.
- `SupabaseScenarioRepository` — implementa el puerto contra un `ScenarioTableClient`, un puerto interno angosto (no el `SupabaseClient` completo) para que sea testeable sin mockear la cadena fluida de supabase-js.
- `SupabaseScenarioTableClient` — único punto que conoce la forma real de `@supabase/supabase-js`.
- `ReliableScenarioRepository` — decorator que envuelve remoto + local: si el remoto falla por cualquier razón (sin red, RLS, Supabase caído, sesión anónima aún no lista), cae a `localStorage` sin lanzar nunca, y reporta el estado (`'synced' | 'offline'`) vía un callback. Satisface el requisito de fiabilidad (ISO 25010) sin que dominio ni aplicación se enteren — exactamente el punto de extensión que ADR 0001 y ADR 0012 ya preveían.
- `main.tsx` (composition root) crea el cliente de Supabase solo si `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` están definidas; si no, usa `LocalStorageScenarioRepository` directo — la app funciona igual sin Supabase configurado.

### 5. Dos campos de estado, no uno

`scenarioStore` separa `persistenceStatus` ('idle'/'saving'/'loading'/'error', propio de cada acción del store) de `syncStatus` ('unknown'/'synced'/'offline', escrito solo por el callback de `ReliableScenarioRepository`). Combinarlos en un único campo se probó primero y falló: como `ReliableScenarioRepository` nunca lanza, una llamada "sin error" no implica "sincronizada", y una acción del store que fijara `'synced'` al no capturar excepción pisaba el `'offline'` que el propio repositorio acababa de reportar durante esa misma llamada. El test de UI que verifica el aviso "guardado solo en este dispositivo" (`ScenarioComparator.test.tsx`) reprodujo esta condición de carrera antes de separar los campos.

## Consecuencias

- La propiedad "100% cliente" de ADR 0012 se relaja deliberadamente: si el usuario configura Supabase, sus comparaciones sí salen del navegador. Sin configurarlo, el comportamiento es idéntico al anterior.
- `npm install @supabase/supabase-js` agrega una dependencia de producción nueva.
- Falta por hacer fuera de esta ADR: crear el proyecto de Supabase real, correr el SQL de arriba, y configurar `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` en Vercel — nada de esto se puede hacer desde el repositorio.
