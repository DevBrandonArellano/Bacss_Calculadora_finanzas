import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { AmortizationRow } from '../../../domain/loans/amortizationRow';
import type { AdvancedAmortizationRow } from '../../../domain/loans/extra-payments/advancedAmortizationRow';
import { formatCurrency, toBalancePoints } from './chartData';

export interface BalanceEvolutionChartProps {
  readonly baseline: readonly AmortizationRow[];
  readonly withExtraPayments?: readonly AdvancedAmortizationRow[];
}

interface ChartPoint {
  readonly period: number;
  readonly baseline?: number;
  readonly withExtraPayments?: number;
}

export function BalanceEvolutionChart({ baseline, withExtraPayments }: BalanceEvolutionChartProps) {
  if (baseline.length === 0) {
    return <p className="text-sm text-gray-500 p-4">Sin datos para mostrar.</p>;
  }

  const baselinePoints = toBalancePoints(baseline);
  const extraPoints = withExtraPayments !== undefined ? toBalancePoints(withExtraPayments) : [];
  const length = Math.max(baselinePoints.length, extraPoints.length);

  const data: ChartPoint[] = Array.from({ length }, (_, index) => ({
    period: index + 1,
    baseline: baselinePoints[index]?.balance,
    withExtraPayments: extraPoints[index]?.balance,
  }));

  const monthsSaved =
    withExtraPayments !== undefined ? baselinePoints.length - extraPoints.length : null;

  return (
    <div className="p-4">
      <h3 className="text-sm font-semibold mb-2">Evolución del saldo</h3>
      <p className="text-sm text-gray-600 mb-1">
        Muestra cómo baja el saldo pendiente del préstamo mes a mes hasta llegar a cero
        {withExtraPayments !== undefined
          ? ': la línea verde (con abonos) cae más rápido que la azul (sin abonos).'
          : '.'}
      </p>
      {monthsSaved !== null && monthsSaved > 0 && (
        <p className="text-sm text-green-700 mb-2 font-medium">
          {`Con los abonos, terminás de pagar ${String(monthsSaved)} meses antes.`}
        </p>
      )}
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
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
          <Line type="monotone" dataKey="baseline" name="Sin abonos" stroke="#2563eb" dot={false} />
          {withExtraPayments !== undefined && (
            <Line
              type="monotone"
              dataKey="withExtraPayments"
              name="Con abonos"
              stroke="#16a34a"
              dot={false}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default BalanceEvolutionChart;
