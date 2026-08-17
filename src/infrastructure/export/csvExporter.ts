import { format } from 'date-fns';
import type { Exporter } from '../../application/ports/exporter';
import type { AmortizationRow } from '../../domain/loans/amortizationRow';
import type { AdvancedAmortizationRow } from '../../domain/loans/extra-payments/advancedAmortizationRow';

const BASE_HEADER = ['Periodo', 'Fecha', 'Cuota', 'Interes', 'Capital', 'Saldo'];
const ADVANCED_HEADER = [...BASE_HEADER, 'Abono', 'CapitalTotal'];

function isAdvancedRow(
  row: AmortizationRow | AdvancedAmortizationRow,
): row is AdvancedAmortizationRow {
  return 'extraPayment' in row;
}

export class CsvExporter implements Exporter<
  readonly (AmortizationRow | AdvancedAmortizationRow)[]
> {
  export(data: readonly (AmortizationRow | AdvancedAmortizationRow)[]): Promise<string> {
    const firstRow = data[0];
    const header =
      firstRow !== undefined && isAdvancedRow(firstRow) ? ADVANCED_HEADER : BASE_HEADER;

    const lines = data.map((row) => {
      const baseFields = [
        String(row.periodNumber),
        format(row.date, 'yyyy-MM-dd'),
        row.installment.toFixed(2),
        row.interest.toFixed(2),
        row.principalPaid.toFixed(2),
        row.remainingBalance.toFixed(2),
      ];
      if (isAdvancedRow(row)) {
        return [...baseFields, row.extraPayment.toFixed(2), row.totalPrincipalPaid.toFixed(2)].join(
          ',',
        );
      }
      return baseFields.join(',');
    });

    return Promise.resolve([header.join(','), ...lines].join('\n'));
  }
}
