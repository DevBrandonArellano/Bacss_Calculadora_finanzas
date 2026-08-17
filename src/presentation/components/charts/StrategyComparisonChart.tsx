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
import { simulateExtraPayments } from '../../../domain/loans/extra-payments/extraPaymentSimulator';
import { ReduceTermStrategy } from '../../../domain/loans/extra-payments/reduceTermStrategy';
import { ReducePaymentStrategy } from '../../../domain/loans/extra-payments/reducePaymentStrategy';
import type { AmortizationRequest } from '../../../domain/loans/amortizationEngine';
import type { ExtraPayment } from '../../../domain/loans/extra-payments/extraPayment';
import type { RecurringContribution } from '../../../domain/loans/extra-payments/recurringContribution';
import { formatCurrency, toStrategyComparisonPoints } from './chartData';

export interface StrategyComparisonChartProps {
  readonly baseRequest: AmortizationRequest;
  readonly extraPayments: readonly ExtraPayment[];
  readonly recurringContributions: readonly RecurringContribution[];
}

export function StrategyComparisonChart({
  baseRequest,
  extraPayments,
  recurringContributions,
}: StrategyComparisonChartProps) {
  const reduceTermComparison = simulateExtraPayments({
    baseRequest,
    strategy: new ReduceTermStrategy(),
    extraPayments,
    recurringContributions,
  });
  const reducePaymentComparison = simulateExtraPayments({
    baseRequest,
    strategy: new ReducePaymentStrategy(),
    extraPayments,
    recurringContributions,
  });

  const reduceTermRows = reduceTermComparison.withExtraPayments.schedule;
  const reducePaymentRows = reducePaymentComparison.withExtraPayments.schedule;
  const data = toStrategyComparisonPoints(reduceTermRows, reducePaymentRows);

  const reduceTermFinalInstallment = reduceTermRows.at(-1)?.installment;
  const reducePaymentFinalInstallment = reducePaymentRows.at(-1)?.installment;

  return (
    <div className="p-4">
      <h3 className="text-sm font-semibold mb-2">Reducir plazo vs reducir cuota</h3>
      <p className="text-sm text-gray-600 mb-1">
        Compara cómo evoluciona tu cuota mensual bajo cada estrategia, con los mismos aportes.
        &quot;Reducir plazo&quot; mantiene la cuota casi igual pero termina antes; &quot;reducir
        cuota&quot; la va bajando pero mantenés el pago hasta el plazo original.
      </p>
      <p className="text-sm text-green-700 mb-2 font-medium">
        {`Con "reducir plazo" terminás en el mes ${String(reduceTermRows.length)} pagando ${
          reduceTermFinalInstallment !== undefined
            ? formatCurrency(reduceTermFinalInstallment.toNumber())
            : '—'
        }. Con "reducir cuota" seguís pagando hasta el mes ${String(reducePaymentRows.length)}, con una cuota final de ${
          reducePaymentFinalInstallment !== undefined
            ? formatCurrency(reducePaymentFinalInstallment.toNumber())
            : '—'
        }.`}
      </p>
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
          <Line
            type="monotone"
            dataKey="reduceTerm"
            name="Reducir plazo"
            stroke="#2563eb"
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="reducePayment"
            name="Reducir cuota"
            stroke="#f59e0b"
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default StrategyComparisonChart;
