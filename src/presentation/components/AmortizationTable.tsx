import { format } from 'date-fns';
import type { AmortizationRow } from '../../domain/loans/amortizationRow';
import type { AdvancedAmortizationRow } from '../../domain/loans/extra-payments/advancedAmortizationRow';
import { getCsvExporter, getXlsxExporter } from '../state/exporterRegistry';
import type { ScheduleRows } from '../state/exporterRegistry';

export interface AmortizationTableProps {
  readonly rows: readonly (AmortizationRow | AdvancedAmortizationRow)[];
}

function isAdvancedRow(
  row: AmortizationRow | AdvancedAmortizationRow,
): row is AdvancedAmortizationRow {
  return 'extraPayment' in row;
}

function triggerDownload(data: string | Uint8Array, filename: string, mimeType: string): void {
  const blob = new Blob([data as BlobPart], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

async function handleExportCsv(rows: ScheduleRows): Promise<void> {
  const data = await getCsvExporter().export(rows);
  triggerDownload(data, 'amortizacion.csv', 'text/csv;charset=utf-8');
}

async function handleExportXlsx(rows: ScheduleRows): Promise<void> {
  const data = await getXlsxExporter().export(rows);
  triggerDownload(
    data,
    'amortizacion.xlsx',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  );
}

export function AmortizationTable({ rows }: AmortizationTableProps) {
  if (rows.length === 0) {
    return <p className="text-sm text-gray-500 p-4">Sin datos para mostrar.</p>;
  }

  const hasAdvancedColumns = isAdvancedRow(rows[0] as AmortizationRow | AdvancedAmortizationRow);

  return (
    <div>
      <div className="flex justify-end gap-2 p-2">
        <button
          type="button"
          className="text-sm border rounded px-3 py-1 hover:bg-gray-100"
          onClick={() => {
            void handleExportCsv(rows);
          }}
        >
          Exportar CSV
        </button>
        <button
          type="button"
          className="text-sm border rounded px-3 py-1 hover:bg-gray-100"
          onClick={() => {
            void handleExportXlsx(rows);
          }}
        >
          Exportar XLSX
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-100 text-left">
              <th className="px-2 py-1">Periodo</th>
              <th className="px-2 py-1">Fecha</th>
              <th className="px-2 py-1">Cuota</th>
              <th className="px-2 py-1">Interés</th>
              <th className="px-2 py-1">Capital</th>
              <th className="px-2 py-1">Saldo</th>
              {hasAdvancedColumns && (
                <>
                  <th className="px-2 py-1">Abono</th>
                  <th className="px-2 py-1">Capital Total</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const advanced = isAdvancedRow(row) ? row : null;
              const hasExtraPayment = advanced !== null && !advanced.extraPayment.isZero();

              return (
                <tr key={row.periodNumber} className={hasExtraPayment ? 'bg-amber-100' : undefined}>
                  <td className="px-2 py-1">{row.periodNumber}</td>
                  <td className="px-2 py-1">{format(row.date, 'yyyy-MM-dd')}</td>
                  <td className="px-2 py-1">{row.installment.toFixed(2)}</td>
                  <td className="px-2 py-1">{row.interest.toFixed(2)}</td>
                  <td className="px-2 py-1">{row.principalPaid.toFixed(2)}</td>
                  <td className="px-2 py-1">{row.remainingBalance.toFixed(2)}</td>
                  {advanced !== null && (
                    <>
                      <td className="px-2 py-1">{advanced.extraPayment.toFixed(2)}</td>
                      <td className="px-2 py-1">{advanced.totalPrincipalPaid.toFixed(2)}</td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AmortizationTable;
