import { useScenarioStore } from '../state/scenarioStore';
import type { AmortizationSystemName, TermUnit } from '../state/loanStore';
import type { MonthlyConversionMethod } from '../../domain/shared/interestRate';

export function ScenarioComparator() {
  const rows = useScenarioStore((state) => state.rows);
  const comparison = useScenarioStore((state) => state.comparison);
  const error = useScenarioStore((state) => state.error);
  const addRow = useScenarioStore((state) => state.addRow);
  const removeRow = useScenarioStore((state) => state.removeRow);
  const updateRow = useScenarioStore((state) => state.updateRow);
  const compare = useScenarioStore((state) => state.compare);

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Comparador de escenarios</h2>
        <button
          type="button"
          className="text-sm text-blue-600 hover:underline"
          onClick={() => {
            addRow();
          }}
        >
          Agregar escenario
        </button>
      </div>

      {rows.length === 0 && (
        <p className="text-sm text-gray-500">
          Agrega al menos un escenario para compararlo contra otros.
        </p>
      )}

      {rows.map((row) => (
        <fieldset key={row.id} className="border rounded p-3 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <legend className="text-sm font-semibold px-1">{row.label}</legend>
            <button
              type="button"
              aria-label={`Quitar ${row.label}`}
              className="text-sm text-red-600 hover:underline"
              onClick={() => {
                removeRow(row.id);
              }}
            >
              Quitar
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-sm" htmlFor={`principal-${row.id}`}>
              {`Monto (${row.label})`}
              <input
                id={`principal-${row.id}`}
                type="number"
                min="0"
                step="0.01"
                className="border rounded px-2 py-1"
                value={row.principal}
                onChange={(event) => {
                  updateRow(row.id, { principal: event.target.value });
                }}
              />
            </label>

            <label className="flex flex-col gap-1 text-sm" htmlFor={`annualRate-${row.id}`}>
              {`Tasa anual (${row.label})`}
              <input
                id={`annualRate-${row.id}`}
                type="number"
                min="0"
                step="0.01"
                className="border rounded px-2 py-1"
                value={row.annualRatePercent}
                onChange={(event) => {
                  updateRow(row.id, { annualRatePercent: event.target.value });
                }}
              />
            </label>

            <label className="flex flex-col gap-1 text-sm" htmlFor={`term-${row.id}`}>
              {`Plazo (${row.label})`}
              <input
                id={`term-${row.id}`}
                type="number"
                min="1"
                step="1"
                className="border rounded px-2 py-1"
                value={row.termValue}
                onChange={(event) => {
                  updateRow(row.id, { termValue: event.target.value });
                }}
              />
            </label>

            <label className="flex flex-col gap-1 text-sm" htmlFor={`termUnit-${row.id}`}>
              {`Unidad de plazo (${row.label})`}
              <select
                id={`termUnit-${row.id}`}
                className="border rounded px-2 py-1"
                value={row.termUnit}
                onChange={(event) => {
                  updateRow(row.id, { termUnit: event.target.value as TermUnit });
                }}
              >
                <option value="months">Meses</option>
                <option value="years">Años</option>
              </select>
            </label>

            <label className="flex flex-col gap-1 text-sm" htmlFor={`system-${row.id}`}>
              {`Sistema (${row.label})`}
              <select
                id={`system-${row.id}`}
                className="border rounded px-2 py-1"
                value={row.system}
                onChange={(event) => {
                  updateRow(row.id, { system: event.target.value as AmortizationSystemName });
                }}
              >
                <option value="french">Francés</option>
                <option value="german">Alemán</option>
              </select>
            </label>

            <label
              className="flex flex-col gap-1 text-sm"
              htmlFor={`rateConversionMethod-${row.id}`}
            >
              {`Conversión de tasa (${row.label})`}
              <select
                id={`rateConversionMethod-${row.id}`}
                className="border rounded px-2 py-1"
                value={row.rateConversionMethod}
                onChange={(event) => {
                  updateRow(row.id, {
                    rateConversionMethod: event.target.value as MonthlyConversionMethod | '',
                  });
                }}
              >
                <option value="">Selecciona un método...</option>
                <option value="nominal">Nominal (i/12)</option>
                <option value="effective">Efectiva ((1+i)^(1/12)-1)</option>
              </select>
            </label>

            <label className="flex flex-col gap-1 text-sm" htmlFor={`startDate-${row.id}`}>
              {`Fecha de inicio (${row.label})`}
              <input
                id={`startDate-${row.id}`}
                type="date"
                className="border rounded px-2 py-1"
                value={row.startDate}
                onChange={(event) => {
                  updateRow(row.id, { startDate: event.target.value });
                }}
              />
            </label>
          </div>
        </fieldset>
      ))}

      {rows.length > 0 && (
        <button
          type="button"
          className="bg-blue-600 text-white rounded px-4 py-2 hover:bg-blue-700 self-start"
          onClick={() => {
            compare();
          }}
        >
          Comparar
        </button>
      )}

      {error !== null && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      {comparison !== null && (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-100 text-left">
                <th className="px-2 py-1">Escenario</th>
                <th className="px-2 py-1">Cuota</th>
                <th className="px-2 py-1">Interés total</th>
                <th className="px-2 py-1">Total pagado</th>
                <th className="px-2 py-1">Plazo (meses)</th>
                <th className="px-2 py-1">Ahorro vs base</th>
              </tr>
            </thead>
            <tbody>
              {comparison.rows.map((row) => (
                <tr key={row.label}>
                  <td className="px-2 py-1">{row.label}</td>
                  <td className="px-2 py-1">{row.installment?.toFixed(2) ?? 'Variable'}</td>
                  <td className="px-2 py-1">{row.totalInterest.toFixed(2)}</td>
                  <td className="px-2 py-1">{row.totalPaid.toFixed(2)}</td>
                  <td className="px-2 py-1">{row.termInMonths}</td>
                  <td className="px-2 py-1">{row.interestSavedVsBaseline.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default ScenarioComparator;
