import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { AmortizationRow } from '../../../domain/loans/amortizationRow';
import type { AdvancedAmortizationRow } from '../../../domain/loans/extra-payments/advancedAmortizationRow';
import { formatCurrency, toInstallmentBreakdown } from './chartData';

export interface InstallmentDistributionChartProps {
  readonly rows: readonly (AmortizationRow | AdvancedAmortizationRow)[];
}

export function InstallmentDistributionChart({ rows }: InstallmentDistributionChartProps) {
  if (rows.length === 0) {
    return <p className="text-sm text-gray-500 p-4">Sin datos para mostrar.</p>;
  }

  const data = toInstallmentBreakdown(rows);

  return (
    <div className="p-4">
      <h3 className="text-sm font-semibold mb-2">Distribución de cada cuota</h3>
      <p className="text-sm text-gray-600 mb-2">
        Cada barra es una cuota: la parte roja es interés, la azul es capital. A medida que avanza
        el préstamo pagás cada vez menos interés y más capital.
      </p>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="period"
            label={{ value: 'Periodo', position: 'insideBottom', offset: -5 }}
          />
          <YAxis />
          <Tooltip
            formatter={(value) => formatCurrency(Number(value))}
            labelFormatter={(label) => `Periodo ${String(Number(label))}`}
          />
          <Legend />
          <Bar dataKey="interest" name="Interés" stackId="cuota" fill="#dc2626" />
          <Bar dataKey="principal" name="Capital" stackId="cuota" fill="#2563eb" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default InstallmentDistributionChart;
