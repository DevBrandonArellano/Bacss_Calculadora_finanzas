import ExcelJS from 'exceljs';
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

export class XlsxExporter implements Exporter<
  readonly (AmortizationRow | AdvancedAmortizationRow)[]
> {
  async export(data: readonly (AmortizationRow | AdvancedAmortizationRow)[]): Promise<Uint8Array> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Amortizacion');

    const firstRow = data[0];
    const header =
      firstRow !== undefined && isAdvancedRow(firstRow) ? ADVANCED_HEADER : BASE_HEADER;
    worksheet.addRow(header);

    for (const row of data) {
      const baseFields: (string | number)[] = [
        row.periodNumber,
        format(row.date, 'yyyy-MM-dd'),
        row.installment.toNumber(),
        row.interest.toNumber(),
        row.principalPaid.toNumber(),
        row.remainingBalance.toNumber(),
      ];
      if (isAdvancedRow(row)) {
        worksheet.addRow([
          ...baseFields,
          row.extraPayment.toNumber(),
          row.totalPrincipalPaid.toNumber(),
        ]);
      } else {
        worksheet.addRow(baseFields);
      }
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return new Uint8Array(buffer);
  }
}
