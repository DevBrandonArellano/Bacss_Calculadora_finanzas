import { Money } from '../shared/money';
import { InvalidInputError } from '../shared/errors';
import { runAmortization } from '../loans/amortizationEngine';
import type { Scenario } from './scenario';

export interface ScenarioSummaryRow {
  readonly label: string;
  readonly installment: Money | null;
  readonly totalInterest: Money;
  readonly totalPaid: Money;
  readonly termInMonths: number;
  readonly interestSavedVsBaseline: Money;
}

export interface ScenarioComparisonResult {
  readonly rows: readonly ScenarioSummaryRow[];
}

export function compareScenarios(scenarios: readonly Scenario[]): ScenarioComparisonResult {
  const [firstScenario] = scenarios;
  if (firstScenario === undefined) {
    throw new InvalidInputError('At least one scenario is required', 'scenarios', scenarios);
  }

  const results = scenarios.map((scenario) => ({
    label: scenario.label,
    result: runAmortization(scenario.request),
  }));

  // Invariante: firstScenario !== undefined arriba ya garantiza results.length >= 1.
  const baselineInterest = (results[0] as (typeof results)[number]).result.summary.totalInterest;

  const rows: ScenarioSummaryRow[] = results.map(({ label, result }) => ({
    label,
    installment: result.summary.installment,
    totalInterest: result.summary.totalInterest,
    totalPaid: result.summary.totalPaid,
    termInMonths: result.summary.termInMonths,
    interestSavedVsBaseline: baselineInterest.subtract(result.summary.totalInterest),
  }));

  return { rows };
}
