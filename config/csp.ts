/**
 * Content-Security-Policy de la aplicación — fuente de verdad única.
 *
 * Se consume desde dos lugares que no pueden compartir código en tiempo de
 * ejecución:
 *
 * - `vite.config.ts`, que la inyecta como `<meta http-equiv>` en el build de
 *   producción (ver ADR 0008). Es la que ejercitan los E2E vía `vite preview`.
 * - `vercel.json`, que la envía como header HTTP real en producción. Un header
 *   es estrictamente mejor que el `<meta>`: directivas como `frame-ancestors`
 *   son ignoradas cuando la política llega en un `<meta>`.
 *
 * Como `vercel.json` es JSON estático y no puede importar este módulo,
 * `config/csp.test.ts` verifica que ambos valores coincidan. Si alguien cambia
 * uno y olvida el otro, el test falla en CI.
 *
 * `style-src` necesita `'unsafe-inline'`: Tailwind y Recharts aplican estilos
 * en línea en tiempo de ejecución.
 *
 * `connect-src` incluye `https://*.supabase.co` (ADR 0012, restricción 3):
 * necesario para la persistencia remota opcional (ADR 0013). Si no se
 * configuran las variables `VITE_SUPABASE_*`, la app nunca llama a ese
 * dominio, pero la directiva debe estar abierta de antemano porque la CSP no
 * puede cambiar en tiempo de ejecución.
 */
export const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self' https://*.supabase.co",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');
