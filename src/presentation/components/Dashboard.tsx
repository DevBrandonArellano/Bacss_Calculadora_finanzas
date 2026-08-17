import type { AmortizationSummary } from '../../domain/loans/amortizationEngine';
import type { Money } from '../../domain/shared/money';
import type { LoanResult } from '../state/loanStore';

/** La cuota "actual" no es siempre la del resumen: con abonos y estrategia de
 * reducir cuota, el monto cambia entre segmentos (summary.installment da null
 * porque no es constante en toda la historia). Se usa la cuota de la última
 * fila — el monto que el usuario paga hoy — en vez del historial completo. */
function currentInstallment(result: LoanResult): Money | null {
  if (result.kind === 'simple') {
    return result.data.summary.installment;
  }
  return result.data.withExtraPayments.schedule.at(-1)?.installment ?? null;
}

export interface DashboardProps {
  readonly result: LoanResult | null;
  readonly optionalCosts?: Money;
  readonly annualRatePercent?: string;
}

function Indicator({ label, value }: { label: string; value: string }) {
  return (
    <div className="border rounded p-3 flex flex-col gap-1">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-lg font-semibold">{value}</span>
    </div>
  );
}

function summaryOf(result: LoanResult): AmortizationSummary {
  return result.kind === 'simple' ? result.data.summary : result.data.withExtraPayments.summary;
}

export function Dashboard({ result, optionalCosts, annualRatePercent }: DashboardProps) {
  if (result === null) {
    return (
      <p className="text-sm text-gray-500 p-4">
        Completa el formulario y presiona &quot;Calcular&quot; para ver el resumen del préstamo.
      </p>
    );
  }

  const summary = summaryOf(result);
  const installment = currentInstallment(result);
  const hasOptionalCosts = optionalCosts !== undefined && !optionalCosts.isZero();

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4">
      <Indicator label="Capital" value={summary.totalPrincipal.toFixed(2)} />
      <Indicator
        label={result.kind === 'withExtraPayments' ? 'Cuota actual' : 'Cuota'}
        value={installment?.toFixed(2) ?? 'Variable'}
      />
      {annualRatePercent !== undefined && (
        <Indicator label="Tasa anual" value={`${annualRatePercent}%`} />
      )}
      <Indicator label="Plazo (meses)" value={String(summary.termInMonths)} />
      <Indicator label="Interés total" value={summary.totalInterest.toFixed(2)} />
      <Indicator label="Total pagado" value={summary.totalPaid.toFixed(2)} />
      {hasOptionalCosts && (
        <>
          <Indicator label="Costos opcionales" value={optionalCosts.toFixed(2)} />
          <Indicator
            label="Total con costos"
            value={summary.totalPaid.add(optionalCosts).toFixed(2)}
          />
        </>
      )}
      {result.kind === 'withExtraPayments' && (
        <Indicator
          label="Ahorro"
          value={`${result.data.interestSaved.toFixed(2)} (${String(result.data.monthsSaved)} meses)`}
        />
      )}
    </div>
  );
}

export default Dashboard;
