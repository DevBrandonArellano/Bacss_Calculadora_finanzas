import type { Logger, LogSeverity } from '../../application/ports/logger';

const SENSITIVE_KEY_PATTERN = /password|token|secret|key/i;

const SEVERITY_TO_CONSOLE_METHOD: Record<LogSeverity, 'error' | 'warn' | 'info' | 'debug'> = {
  emergency: 'error',
  alert: 'error',
  critical: 'error',
  error: 'error',
  warning: 'warn',
  notice: 'info',
  informational: 'info',
  debug: 'debug',
};

function sanitizeContext(context: Record<string, unknown> | undefined): Record<string, unknown> {
  if (context === undefined) {
    return {};
  }
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(context)) {
    sanitized[key] = SENSITIVE_KEY_PATTERN.test(key) ? '[REDACTED]' : value;
  }
  return sanitized;
}

/**
 * Implementación concreta del puerto Logger con los 8 niveles de severidad de
 * RFC 5424, mapeados a los métodos de console disponibles en el navegador/Node.
 * Filtra defensivamente campos de contexto que luzcan sensibles (ISO 27001).
 */
export class Rfc5424Logger implements Logger {
  log(entry: { severity: LogSeverity; message: string; context?: Record<string, unknown> }): void {
    const timestamp = new Date().toISOString();
    const sanitizedContext = sanitizeContext(entry.context);

    const payload = JSON.stringify({
      timestamp,
      severity: entry.severity,
      message: entry.message,
      context: sanitizedContext,
    });

    const consoleMethod = SEVERITY_TO_CONSOLE_METHOD[entry.severity];
    console[consoleMethod](payload);
  }
}
