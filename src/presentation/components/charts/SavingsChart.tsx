import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { Money } from '../../../domain/shared/money';
import { formatCurrency, toSavingsSummary } from './chartData';

export interface SavingsChartProps {
  readonly savings: { readonly interestSaved: Money; readonly monthsSaved: number } | null;
}

export function SavingsChart({ savings }: SavingsChartProps) {
  if (savings === null) {
    return (
      <p className="text-sm text-gray-500 p-4">
        Aplica un abono extraordinario para ver el ahorro generado.
      </p>
    );
  }

  const { interestSaved, monthsSaved } = toSavingsSummary(
    savings.interestSaved,
    savings.monthsSaved,
  );
  const data = [{ category: 'Interés ahorrado', interestSaved }];

  return (
    <div className="p-4">
      <h3 className="text-sm font-semibold mb-2">Ahorro generado por abonos</h3>
      <p className="text-sm text-gray-600 mb-1">
        Cuánto dinero te ahorrás en intereses gracias a tus abonos extraordinarios.
      </p>
      <p className="text-sm text-green-700 mb-2 font-medium">
        {`Ahorrás ${formatCurrency(interestSaved)} en intereses y reducís el plazo en ${String(monthsSaved)} meses.`}
      </p>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="category" />
          <YAxis />
          <Tooltip formatter={(value) => formatCurrency(Number(value))} />
          <Bar dataKey="interestSaved" name="Interés ahorrado" fill="#16a34a" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default SavingsChart;
