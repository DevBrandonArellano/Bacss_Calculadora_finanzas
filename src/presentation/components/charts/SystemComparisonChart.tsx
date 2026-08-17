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
import { AmortizationEngine } from '../../../domain/loans/amortizationEngine';
import type { AmortizationRequest } from '../../../domain/loans/amortizationEngine';
import { FrenchAmortization } from '../../../domain/loans/frenchAmortization';
import { GermanAmortization } from '../../../domain/loans/germanAmortization';
import { formatCurrency, toSystemComparisonPoints } from './chartData';

export interface SystemComparisonChartProps {
  readonly baseRequest: AmortizationRequest;
}

export function SystemComparisonChart({ baseRequest }: SystemComparisonChartProps) {
  const { principal, annualRate, rateConversionMethod, term, startDate } = baseRequest;
  const frenchResult = AmortizationEngine.run({
    principal,
    annualRate,
    rateConversionMethod,
    term,
    startDate,
    system: new FrenchAmortization(),
  });
  const germanResult = AmortizationEngine.run({
    principal,
    annualRate,
    rateConversionMethod,
    term,
    startDate,
    system: new GermanAmortization(),
  });

  const data = toSystemComparisonPoints(frenchResult.schedule, germanResult.schedule);

  const frenchInterest = frenchResult.summary.totalInterest;
  const germanInterest = germanResult.summary.totalInterest;
  const conclusion = frenchInterest.equals(germanInterest)
    ? 'Con estos datos, ambos sistemas pagan el mismo interés total.'
    : germanInterest.lessThan(frenchInterest)
      ? `Con estos datos, el sistema alemán te ahorraría ${formatCurrency(frenchInterest.subtract(germanInterest).toNumber())} en intereses totales (arranca con cuotas más altas, pero baja el saldo más rápido).`
      : `Con estos datos, el sistema francés te ahorraría ${formatCurrency(germanInterest.subtract(frenchInterest).toNumber())} en intereses totales.`;

  return (
    <div className="p-4">
      <h3 className="text-sm font-semibold mb-2">Comparación francés vs alemán</h3>
      <p className="text-sm text-gray-600 mb-1">
        Compara cómo baja el saldo bajo cada sistema, usando el mismo monto, tasa y plazo.
      </p>
      <p className="text-sm text-green-700 mb-2 font-medium">{conclusion}</p>
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
          <Line type="monotone" dataKey="french" name="Francés" stroke="#2563eb" dot={false} />
          <Line type="monotone" dataKey="german" name="Alemán" stroke="#f59e0b" dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default SystemComparisonChart;
