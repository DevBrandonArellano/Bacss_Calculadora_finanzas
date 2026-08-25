import type { AmortizationRequest } from '../../../domain/loans/amortizationEngine';
import type { ExtraPaymentInputs, LoanResult } from '../../state/loanStore';
import { BalanceEvolutionChart } from './BalanceEvolutionChart';
import { CapitalVsInterestChart } from './CapitalVsInterestChart';
import { SavingsChart } from './SavingsChart';
import { InstallmentDistributionChart } from './InstallmentDistributionChart';
import { SystemComparisonChart } from './SystemComparisonChart';
import { StrategyComparisonChart } from './StrategyComparisonChart';

export interface ChartsGridProps {
  readonly result: LoanResult;
  readonly baseRequest: AmortizationRequest | null;
  readonly extraPaymentInputs: ExtraPaymentInputs | null;
}

/**
 * Rejilla de gráficos, separada de `ChartsPanel` para poder cargarla de forma
 * diferida: es el único punto del árbol que importa Recharts (~110 kB gzip),
 * y no hace falta hasta que el usuario calcula un préstamo.
 *
 * A diferencia de `ChartsPanel`, aquí `result` nunca es `null`: el caso vacío
 * lo resuelve el panel sin descargar este chunk.
 */
export function ChartsGrid({ result, baseRequest, extraPaymentInputs }: ChartsGridProps) {
  const baseline = result.kind === 'simple' ? result.data : result.data.baseline;
  const withExtraPayments =
    result.kind === 'withExtraPayments' ? result.data.withExtraPayments : null;
  const distributionRows =
    withExtraPayments !== null ? withExtraPayments.schedule : baseline.schedule;
  const savings =
    result.kind === 'withExtraPayments'
      ? { interestSaved: result.data.interestSaved, monthsSaved: result.data.monthsSaved }
      : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <BalanceEvolutionChart
        baseline={baseline.schedule}
        withExtraPayments={withExtraPayments?.schedule}
      />
      <CapitalVsInterestChart
        baseline={baseline.summary}
        withExtraPayments={withExtraPayments?.summary}
      />
      <SavingsChart savings={savings} />
      <InstallmentDistributionChart rows={distributionRows} />
      {baseRequest !== null && <SystemComparisonChart baseRequest={baseRequest} />}
      {result.kind === 'withExtraPayments' &&
        baseRequest !== null &&
        extraPaymentInputs !== null && (
          <StrategyComparisonChart
            baseRequest={baseRequest}
            extraPayments={extraPaymentInputs.extraPayments}
            recurringContributions={extraPaymentInputs.recurringContributions}
          />
        )}
    </div>
  );
}

export default ChartsGrid;
