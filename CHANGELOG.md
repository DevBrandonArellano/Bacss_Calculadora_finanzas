# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/). Este proyecto aún no publica versiones etiquetadas (`package.json` está en `0.0.0`), así que los cambios se acumulan en **[Unreleased]**.

## [Unreleased]

### Added

- **Guardado remoto opcional de comparaciones de escenarios.** El Comparador de escenarios (A/B/C/D) ahora puede guardar y recuperar comparaciones nombradas desde un backend remoto (Supabase), además de seguir guardando en el dispositivo. Si el servidor remoto no está configurado o no responde, la app **cae automáticamente al guardado local sin interrumpir al usuario** — solo muestra un aviso de que esos datos quedaron guardados únicamente en ese dispositivo. No requiere crear una cuenta ni iniciar sesión. Ver [ADR 0013](docs/adr/0013-implementacion-persistencia-remota-supabase.md).
  - Configuración pendiente para producción (fuera de esta entrega, ver README § Despliegue): crear el proyecto de Supabase, aplicar el esquema/políticas de acceso, y configurar las variables de entorno correspondientes.

### Changed

- La Content-Security-Policy ahora permite conexiones al dominio de Supabase (necesario para el guardado remoto opcional); sin la integración configurada, la app no realiza ninguna llamada a ese dominio.
- Los 6 gráficos (Recharts, ~110 kB gzip) ahora se cargan de forma diferida (`React.lazy` sobre un nuevo `ChartsGrid`) solo cuando hay un resultado que graficar, en vez de formar parte del JS inicial de la app.
- El JS inicial (`index` + `react-vendor`) pesa ahora ~131 kB gzip (antes ~76 kB) por agregar `@supabase/supabase-js` como dependencia de producción. Ver README § Despliegue para el detalle de chunks.

### Fixed

- Los tests de `ChartsPanel` esperaban hasta 10 s a que cargara el chunk diferido de gráficos, pero el timeout del propio test seguía en el valor por defecto de Vitest (5 s), así que podían fallar por timeout en entornos más lentos antes de que ese margen de 10 s llegara a cumplirse. Se igualó el timeout del test al de la espera.

<!--
Convenciones de esta sección (Keep a Changelog):
Added / Changed / Deprecated / Removed / Fixed / Security.
Cuando se publique la primera versión, mover el contenido de [Unreleased] bajo
un encabezado `## [X.Y.Z] - AAAA-MM-DD` y dejar [Unreleased] vacío arriba.
-->
