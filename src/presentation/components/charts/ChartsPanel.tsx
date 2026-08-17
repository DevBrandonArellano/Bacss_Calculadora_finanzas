import type { AmortizationRequest } from '../../../domain/loans/amortizationEngine';
import type { ExtraPaymentInputs, LoanResult } from '../../state/loanStore';
import { BalanceEvolutionChart } from './BalanceEvolutionChart';
import { CapitalVsInterestChart } from './CapitalVsInterestChart';
import { SavingsChart } from './SavingsChart';
import { InstallmentDistributionChart } from './InstallmentDistributionChart';
import { SystemComparisonChart } from './SystemComparisonChart';
import { StrategyComparisonChart } from './StrategyComparisonChart';

export interface ChartsPanelProps {
  readonly result: LoanResult | null;
  readonly baseRequest: AmortizationRequest | null;
  readonly extraPaymentInputs: ExtraPaymentInputs | null;
}

export function ChartsPanel({ result, baseRequest, extraPaymentInputs }: ChartsPanelProps) {
  if (result === null) {
    return (
      <p className="text-sm text-gray-500 p-4">
        Completa el formulario y presiona &quot;Calcular&quot; para ver los gráficos.
      </p>
    );
  }

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

export default ChartsPanel;
