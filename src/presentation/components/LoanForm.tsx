import { useLoanStore } from '../state/loanStore';
import type {
  AmortizationSystemName,
  ExtraPaymentStrategyName,
  TermUnit,
} from '../state/loanStore';
import type { MonthlyConversionMethod } from '../../domain/shared/interestRate';

export function LoanForm() {
  const form = useLoanStore((state) => state.form);
  const error = useLoanStore((state) => state.error);
  const updateForm = useLoanStore((state) => state.updateForm);
  const addExtraPaymentRow = useLoanStore((state) => state.addExtraPaymentRow);
  const removeExtraPaymentRow = useLoanStore((state) => state.removeExtraPaymentRow);
  const updateExtraPaymentRow = useLoanStore((state) => state.updateExtraPaymentRow);
  const addRecurringContributionRow = useLoanStore((state) => state.addRecurringContributionRow);
  const removeRecurringContributionRow = useLoanStore(
    (state) => state.removeRecurringContributionRow,
  );
  const updateRecurringContributionRow = useLoanStore(
    (state) => state.updateRecurringContributionRow,
  );
  const calculate = useLoanStore((state) => state.calculate);

  return (
    <form
      className="flex flex-col gap-4 p-4"
      onSubmit={(event) => {
        event.preventDefault();
        calculate();
      }}
    >
      <h2 className="text-lg font-semibold">Datos del préstamo</h2>

      <label className="flex flex-col gap-1 text-sm" htmlFor="principal">
        Monto del préstamo (USD)
        <input
          id="principal"
          type="number"
          min="0"
          step="0.01"
          className="border rounded px-2 py-1"
          value={form.principal}
          onChange={(event) => {
            updateForm({ principal: event.target.value });
          }}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm" htmlFor="annualRate">
        Tasa anual (%)
        <input
          id="annualRate"
          type="number"
          min="0"
          step="0.01"
          className="border rounded px-2 py-1"
          value={form.annualRatePercent}
          onChange={(event) => {
            updateForm({ annualRatePercent: event.target.value });
          }}
        />
      </label>

      <div className="flex gap-2">
        <label className="flex flex-1 flex-col gap-1 text-sm" htmlFor="termValue">
          Plazo
          <input
            id="termValue"
            type="number"
            min="1"
            step="1"
            className="border rounded px-2 py-1"
            value={form.termValue}
            onChange={(event) => {
              updateForm({ termValue: event.target.value });
            }}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm" htmlFor="termUnit">
          Unidad
          <select
            id="termUnit"
            className="border rounded px-2 py-1"
            value={form.termUnit}
            onChange={(event) => {
              updateForm({ termUnit: event.target.value as TermUnit });
            }}
          >
            <option value="months">Meses</option>
            <option value="years">Años</option>
          </select>
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm" htmlFor="system">
        Sistema de amortización
        <select
          id="system"
          className="border rounded px-2 py-1"
          value={form.system}
          onChange={(event) => {
            updateForm({ system: event.target.value as AmortizationSystemName });
          }}
        >
          <option value="french">Francés</option>
          <option value="german">Alemán</option>
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm" htmlFor="rateConversionMethod">
        Conversión de tasa
        <select
          id="rateConversionMethod"
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

      <label className="flex flex-col gap-1 text-sm" htmlFor="startDate">
        Fecha de inicio
        <input
          id="startDate"
          type="date"
          className="border rounded px-2 py-1"
          value={form.startDate}
          onChange={(event) => {
            updateForm({ startDate: event.target.value });
          }}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm" htmlFor="optionalCosts">
        Costos opcionales (ej. seguro obligatorio)
        <input
          id="optionalCosts"
          type="number"
          min="0"
          step="0.01"
          className="border rounded px-2 py-1"
          value={form.optionalCosts}
          onChange={(event) => {
            updateForm({ optionalCosts: event.target.value });
          }}
        />
      </label>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Abonos extraordinarios</h3>
          <button
            type="button"
            className="text-sm text-blue-600 hover:underline"
            onClick={() => {
              addExtraPaymentRow();
            }}
          >
            Agregar abono
          </button>
        </div>

        {form.extraPayments.map((row, index) => {
          const rowNumber = index + 1;
          return (
            <div key={row.id} className="border rounded p-2 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{`Abono ${String(rowNumber)}`}</span>
                <button
                  type="button"
                  aria-label={`Quitar abono ${String(rowNumber)}`}
                  className="text-sm text-red-600 hover:underline"
                  onClick={() => {
                    removeExtraPaymentRow(row.id);
                  }}
                >
                  Quitar
                </button>
              </div>

              <label
                className="flex flex-col gap-1 text-sm"
                htmlFor={`extraPaymentPeriod-${row.id}`}
              >
                {`Período del abono ${String(rowNumber)}`}
                <input
                  id={`extraPaymentPeriod-${row.id}`}
                  type="number"
                  min="1"
                  step="1"
                  className="border rounded px-2 py-1"
                  value={row.periodNumber}
                  onChange={(event) => {
                    updateExtraPaymentRow(row.id, { periodNumber: event.target.value });
                  }}
                />
              </label>
              <label
                className="flex flex-col gap-1 text-sm"
                htmlFor={`extraPaymentAmount-${row.id}`}
              >
                {`Monto del abono ${String(rowNumber)}`}
                <input
                  id={`extraPaymentAmount-${row.id}`}
                  type="number"
                  min="0"
                  step="0.01"
                  className="border rounded px-2 py-1"
                  value={row.amount}
                  onChange={(event) => {
                    updateExtraPaymentRow(row.id, { amount: event.target.value });
                  }}
                />
              </label>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Aportes recurrentes</h3>
          <button
            type="button"
            className="text-sm text-blue-600 hover:underline"
            onClick={() => {
              addRecurringContributionRow();
            }}
          >
            Agregar aporte recurrente
          </button>
        </div>

        {form.recurringContributions.map((row, index) => {
          const rowNumber = index + 1;
          return (
            <div key={row.id} className="border rounded p-2 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{`Aporte recurrente ${String(rowNumber)}`}</span>
                <button
                  type="button"
                  aria-label={`Quitar aporte recurrente ${String(rowNumber)}`}
                  className="text-sm text-red-600 hover:underline"
                  onClick={() => {
                    removeRecurringContributionRow(row.id);
                  }}
                >
                  Quitar
                </button>
              </div>

              <label
                className="flex flex-col gap-1 text-sm"
                htmlFor={`recurringContributionAmount-${row.id}`}
              >
                {`Monto mensual del aporte ${String(rowNumber)}`}
                <input
                  id={`recurringContributionAmount-${row.id}`}
                  type="number"
                  min="0"
                  step="0.01"
                  className="border rounded px-2 py-1"
                  value={row.amount}
                  onChange={(event) => {
                    updateRecurringContributionRow(row.id, { amount: event.target.value });
                  }}
                />
              </label>
              <label
                className="flex flex-col gap-1 text-sm"
                htmlFor={`recurringContributionStart-${row.id}`}
              >
                {`Desde el periodo del aporte ${String(rowNumber)}`}
                <input
                  id={`recurringContributionStart-${row.id}`}
                  type="number"
                  min="1"
                  step="1"
                  className="border rounded px-2 py-1"
                  value={row.startPeriod}
                  onChange={(event) => {
                    updateRecurringContributionRow(row.id, { startPeriod: event.target.value });
                  }}
                />
              </label>
              <label
                className="flex flex-col gap-1 text-sm"
                htmlFor={`recurringContributionEnd-${row.id}`}
              >
                {`Hasta el periodo del aporte ${String(rowNumber)}`}
                <input
                  id={`recurringContributionEnd-${row.id}`}
                  type="number"
                  min="1"
                  step="1"
                  className="border rounded px-2 py-1"
                  value={row.endPeriod}
                  onChange={(event) => {
                    updateRecurringContributionRow(row.id, { endPeriod: event.target.value });
                  }}
                />
              </label>
            </div>
          );
        })}
      </div>

      {(form.extraPayments.length > 0 || form.recurringContributions.length > 0) && (
        <label className="flex flex-col gap-1 text-sm" htmlFor="strategy">
          Estrategia de abono
          <select
            id="strategy"
            className="border rounded px-2 py-1"
            value={form.strategy}
            onChange={(event) => {
              updateForm({ strategy: event.target.value as ExtraPaymentStrategyName });
            }}
          >
            <option value="reduce-term">Reducir plazo</option>
            <option value="reduce-payment">Reducir cuota</option>
          </select>
        </label>
      )}

      {error !== null && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      <button type="submit" className="bg-blue-600 text-white rounded px-4 py-2 hover:bg-blue-700">
        Calcular
      </button>
    </form>
  );
}

export default LoanForm;
