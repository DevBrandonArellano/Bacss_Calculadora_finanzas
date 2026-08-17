import { LoanForm } from './presentation/components/LoanForm';
import { Dashboard } from './presentation/components/Dashboard';
import { AmortizationTable } from './presentation/components/AmortizationTable';
import { ChartsPanel } from './presentation/components/charts/ChartsPanel';
import { ScenarioComparator } from './presentation/components/ScenarioComparator';
import { DebtVsInvestmentPanel } from './presentation/components/DebtVsInvestmentPanel';
import { useLoanStore } from './presentation/state/loanStore';

export function App() {
  const result = useLoanStore((state) => state.result);
  const baseRequest = useLoanStore((state) => state.baseRequest);
  const extraPaymentInputs = useLoanStore((state) => state.extraPaymentInputs);
  const optionalCosts = useLoanStore((state) => state.optionalCosts);
  const annualRatePercent = useLoanStore((state) => state.form.annualRatePercent);

  const rows =
    result === null
      ? []
      : result.kind === 'simple'
        ? result.data.schedule
        : result.data.withExtraPayments.schedule;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-blue-600 text-white px-4 py-3">
        <h1 className="text-xl font-bold">Simulador de Préstamos y Análisis de Inversión</h1>
      </header>

      <div className="flex flex-col lg:flex-row gap-4 p-4">
        <aside className="lg:w-80 lg:flex-shrink-0 bg-white border rounded shadow-sm">
          <LoanForm />
        </aside>

        <main className="flex-1 flex flex-col gap-4">
          <section className="bg-white border rounded shadow-sm">
            <Dashboard
              result={result}
              optionalCosts={optionalCosts}
              annualRatePercent={result !== null ? annualRatePercent : undefined}
            />
          </section>

          <section className="bg-white border rounded shadow-sm">
            <AmortizationTable rows={rows} />
          </section>

          <section className="bg-white border rounded shadow-sm">
            <ChartsPanel
              result={result}
              baseRequest={baseRequest}
              extraPaymentInputs={extraPaymentInputs}
            />
          </section>

          <section className="bg-white border rounded shadow-sm">
            <ScenarioComparator />
          </section>

          <section className="bg-white border rounded shadow-sm">
            <DebtVsInvestmentPanel />
          </section>
        </main>
      </div>
    </div>
  );
}

export default App;
