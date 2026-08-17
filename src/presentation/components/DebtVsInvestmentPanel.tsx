import { useInvestmentStore } from '../state/investmentStore';
import { INVESTMENT_DISCLAIMER } from '../../domain/investments/debtVsInvestmentComparator';
import type { DebtVsInvestmentRecommendation } from '../../domain/investments/debtVsInvestmentComparator';
import type { MonthlyConversionMethod } from '../../domain/shared/interestRate';

const RECOMMENDATION_LABEL: Record<DebtVsInvestmentRecommendation, string> = {
  'pay-debt': 'Conviene abonar la deuda',
  invest: 'Conviene invertir',
  equivalent: 'Ambas opciones son equivalentes',
};

export function DebtVsInvestmentPanel() {
  const form = useInvestmentStore((state) => state.form);
  const result = useInvestmentStore((state) => state.result);
  const error = useInvestmentStore((state) => state.error);
  const updateForm = useInvestmentStore((state) => state.updateForm);
  const compare = useInvestmentStore((state) => state.compare);

  return (
    <div className="flex flex-col gap-4 p-4">
      <h2 className="text-lg font-semibold">¿Abonar deuda o invertir?</h2>

      <form
        className="grid grid-cols-1 md:grid-cols-2 gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          compare();
        }}
      >
        <label className="flex flex-col gap-1 text-sm" htmlFor="availableAmount">
          Dinero disponible
          <input
            id="availableAmount"
            type="number"
            min="0"
            step="0.01"
            className="border rounded px-2 py-1"
            value={form.availableAmount}
            onChange={(event) => {
              updateForm({ availableAmount: event.target.value });
            }}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm" htmlFor="loanPrincipal">
          Monto del préstamo pendiente
          <input
            id="loanPrincipal"
            type="number"
            min="0"
            step="0.01"
            className="border rounded px-2 py-1"
            value={form.loanPrincipal}
            onChange={(event) => {
              updateForm({ loanPrincipal: event.target.value });
            }}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm" htmlFor="loanAnnualRatePercent">
          Tasa del préstamo (anual %)
          <input
            id="loanAnnualRatePercent"
            type="number"
            min="0"
            step="0.01"
            className="border rounded px-2 py-1"
            value={form.loanAnnualRatePercent}
            onChange={(event) => {
              updateForm({ loanAnnualRatePercent: event.target.value });
            }}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm" htmlFor="loanTermValue">
          Horizonte (meses)
          <input
            id="loanTermValue"
            type="number"
            min="1"
            step="1"
            className="border rounded px-2 py-1"
            value={form.loanTermValue}
            onChange={(event) => {
              updateForm({ loanTermValue: event.target.value });
            }}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm" htmlFor="investmentRateConversionMethod">
          Conversión de tasa
          <select
            id="investmentRateConversionMethod"
            className="border rounded px-2 py-1"
            value={form.rateConversionMethod}
            onChange={(event) => {
              updateForm({
                rateConversionMethod: event.target.value as MonthlyConversionMethod | '',
              });
            }}
          >
            <option value="">Selecciona un método...</option>
            <option value="nominal">Nominal (i/12)</option>
            <option value="effective">Efectiva ((1+i)^(1/12)-1)</option>
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm" htmlFor="expectedReturnPercent">
          Rendimiento esperado (anual %)
          <input
            id="expectedReturnPercent"
            type="number"
            min="0"
            step="0.01"
            className="border rounded px-2 py-1"
            value={form.expectedReturnPercent}
            onChange={(event) => {
              updateForm({ expectedReturnPercent: event.target.value });
            }}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm" htmlFor="monthlyContribution">
          Aportes mensuales
          <input
            id="monthlyContribution"
            type="number"
            min="0"
            step="0.01"
            className="border rounded px-2 py-1"
            value={form.monthlyContribution}
            onChange={(event) => {
              updateForm({ monthlyContribution: event.target.value });
            }}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm" htmlFor="taxRatePercent">
          Impuestos sobre la ganancia (%)
          <input
            id="taxRatePercent"
            type="number"
            min="0"
            step="0.01"
            className="border rounded px-2 py-1"
            value={form.taxRatePercent}
            onChange={(event) => {
              updateForm({ taxRatePercent: event.target.value });
            }}
          />
        </label>

        {error !== null && (
          <p role="alert" className="text-sm text-red-600 md:col-span-2">
            {error}
          </p>
        )}

        <button
          type="submit"
          className="bg-blue-600 text-white rounded px-4 py-2 hover:bg-blue-700 self-start md:col-span-2"
        >
          Comparar
        </button>
      </form>

      {result !== null && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="border rounded p-3 flex flex-col gap-1">
            <span className="text-xs text-gray-500">Ahorro garantizado (abonar)</span>
            <span className="text-lg font-semibold">
              {result.guaranteedInterestSaved.toFixed(2)}
            </span>
          </div>
          <div className="border rounded p-3 flex flex-col gap-1">
            <span className="text-xs text-gray-500">Ganancia esperada (invertir)</span>
            <span className="text-lg font-semibold">
              {result.expectedInvestmentGain.toFixed(2)}
            </span>
          </div>
          <div className="border rounded p-3 flex flex-col gap-1">
            <span className="text-xs text-gray-500">ROI de la inversión</span>
            <span className="text-lg font-semibold">
              {result.investmentRoi !== null
                ? `${result.investmentRoi.times(100).toFixed(2)}%`
                : 'N/D'}
            </span>
          </div>
          <div className="border rounded p-3 flex flex-col gap-1">
            <span className="text-xs text-gray-500">Punto de equilibrio (tasa anual)</span>
            <span className="text-lg font-semibold">
              {result.breakEvenAnnualRate.times(100).toFixed(2)}%
            </span>
          </div>
          <div className="border rounded p-3 flex flex-col gap-1">
            <span className="text-xs text-gray-500">Recomendación</span>
            <span className="text-lg font-semibold">
              {RECOMMENDATION_LABEL[result.recommendation]}
            </span>
          </div>
        </div>
      )}

      <p className="text-xs text-gray-500 border-t pt-2">{INVESTMENT_DISCLAIMER}</p>
    </div>
  );
}

export default DebtVsInvestmentPanel;
