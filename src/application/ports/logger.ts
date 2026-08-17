export type LogSeverity =
  'emergency' | 'alert' | 'critical' | 'error' | 'warning' | 'notice' | 'informational' | 'debug';

export interface LogEntry {
  readonly severity: LogSeverity;
  readonly message: string;
  readonly timestamp: Date;
  readonly context?: Record<string, unknown>;
}

export interface Logger {
  log(entry: Omit<LogEntry, 'timestamp'>): void;
}
