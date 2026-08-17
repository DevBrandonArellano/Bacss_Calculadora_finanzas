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
import type { AmortizationSummary } from '../../../domain/loans/amortizationEngine';
import { formatCurrency, toCapitalInterestTotals } from './chartData';

export interface CapitalVsInterestChartProps {
  readonly baseline: AmortizationSummary;
  readonly withExtraPayments?: AmortizationSummary;
}

export function CapitalVsInterestChart({
  baseline,
  withExtraPayments,
}: CapitalVsInterestChartProps) {
  const baselineTotals = toCapitalInterestTotals(baseline);
  const extraTotals =
    withExtraPayments !== undefined ? toCapitalInterestTotals(withExtraPayments) : null;

  const data = [
    {
      category: 'Capital',
      original: baselineTotals.capital,
      withExtraPayments: extraTotals?.capital,
    },
    {
      category: 'Interés',
      original: baselineTotals.interest,
      withExtraPayments: extraTotals?.interest,
    },
  ];

  const interestPercent =
    (baselineTotals.interest / (baselineTotals.capital + baselineTotals.interest)) * 100;

  return (
    <div className="p-4">
      <h3 className="text-sm font-semibold mb-2">Capital vs intereses</h3>
      <p className="text-sm text-gray-600 mb-2">
        {`Compara cuánto del total pagado es capital (lo que debías) vs interés (el costo del préstamo). El interés representa el ${interestPercent.toFixed(1)}% del total pagado.`}
      </p>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="category" />
          <YAxis />
          <Tooltip formatter={(value) => formatCurrency(Number(value))} />
          <Legend />
          <Bar dataKey="original" name="Original" fill="#2563eb" />
          {extraTotals !== null && (
            <Bar dataKey="withExtraPayments" name="Con abonos" fill="#16a34a" />
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default CapitalVsInterestChart;
