import type { Exporter } from '../../application/ports/exporter';
import type { AmortizationRow } from '../../domain/loans/amortizationRow';
import type { AdvancedAmortizationRow } from '../../domain/loans/extra-payments/advancedAmortizationRow';

export type ScheduleRows = readonly (AmortizationRow | AdvancedAmortizationRow)[];
export type ScheduleExporter = Exporter<ScheduleRows>;

/** Registro de exportadores: mismo patrón que el logger en loanStore.ts.
 * `presentation` no importa `infrastructure` directamente (Fase 0); el
 * composition root (`main.tsx`) inyecta los exportadores reales. */
class NoOpExporter implements ScheduleExporter {
  export(): Promise<string> {
    return Promise.resolve('');
  }
}

let activeCsvExporter: ScheduleExporter = new NoOpExporter();
let activeXlsxExporter: ScheduleExporter = new NoOpExporter();

export function setCsvExporter(exporter: ScheduleExporter): void {
  activeCsvExporter = exporter;
}

export function setXlsxExporter(exporter: ScheduleExporter): void {
  activeXlsxExporter = exporter;
}

export function getCsvExporter(): ScheduleExporter {
  return activeCsvExporter;
}

export function getXlsxExporter(): ScheduleExporter {
  return activeXlsxExporter;
}
