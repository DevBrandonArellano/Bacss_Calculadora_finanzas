import { addMonths } from 'date-fns';
import { Money } from '../../shared/money';
import { Term } from '../../shared/term';
import { InvalidInputError } from '../../shared/errors';
import { runAmortization, buildSummary } from '../amortizationEngine';
import type {
  AmortizationRequest,
  AmortizationResult,
  AmortizationSummary,
  NonEmptySchedule,
} from '../amortizationEngine';
import { validateExtraPayments } from './extraPayment';
import type { ExtraPayment } from './extraPayment';
import { expandRecurringContribution } from './recurringContribution';
import type { RecurringContribution } from './recurringContribution';
import type { ExtraPaymentStrategy } from './extraPaymentStrategy';
import type { AdvancedAmortizationRow } from './advancedAmortizationRow';

export interface ExtraPaymentRequest {
  readonly baseRequest: AmortizationRequest;
  readonly strategy: ExtraPaymentStrategy;
  readonly extraPayments: readonly ExtraPayment[];
  readonly recurringContributions?: readonly RecurringContribution[];
}

/**
 * Fusiona abonos únicos con aportes recurrentes ya expandidos, sumando montos
 * cuando coinciden en el mismo periodo (a diferencia de dos abonos únicos
 * duplicados en el mismo periodo, que validateExtraPayments trata como error).
 */
function mergeExtraPayments(
  oneTime: readonly ExtraPayment[],
  recurring: readonly RecurringContribution[],
): ExtraPayment[] {
  const byPeriod = new Map<number, Money>();

  for (const payment of oneTime) {
    const existing = byPeriod.get(payment.periodNumber);
    byPeriod.set(
      payment.periodNumber,
      existing === undefined ? payment.amount : existing.add(payment.amount),
    );
  }

  for (const contribution of recurring) {
    for (const payment of expandRecurringContribution(contribution)) {
      const existing = byPeriod.get(payment.periodNumber);
      byPeriod.set(
        payment.periodNumber,
        existing === undefined ? payment.amount : existing.add(payment.amount),
      );
    }
  }

  return Array.from(byPeriod.entries())
    .map(([periodNumber, amount]) => ({ periodNumber, amount }))
    .sort((a, b) => a.periodNumber - b.periodNumber);
}

export interface AdvancedAmortizationResult {
  readonly schedule: readonly AdvancedAmortizationRow[];
  readonly summary: AmortizationSummary;
}

export interface ExtraPaymentComparison {
  readonly baseline: AmortizationResult;
  readonly withExtraPayments: AdvancedAmortizationResult;
  readonly interestSaved: Money;
  readonly monthsSaved: number;
}

export function simulateExtraPayments(request: ExtraPaymentRequest): ExtraPaymentComparison {
  const { baseRequest, strategy, extraPayments, recurringContributions = [] } = request;
  const { system, principal, annualRate, rateConversionMethod, term, startDate } = baseRequest;

  const totalPeriods = term.toMonths();
  const currency = principal.currency;
  const mergedPayments = mergeExtraPayments(extraPayments, recurringContributions);
  validateExtraPayments(mergedPayments, totalPeriods, currency);

  const baseline = runAmortization(baseRequest);
  const monthlyRate = annualRate.toMonthly(rateConversionMethod);
  const sortedPayments = mergedPayments;

  const advancedRows: AdvancedAmortizationRow[] = [];
  let segmentPrincipal = principal;
  let segmentStartDate = startDate;
  let segmentTermBudget = totalPeriods;
  let absoluteOffset = 0;
  let earlyPayoff = false;

  for (const payment of sortedPayments) {
    const relativeN = payment.periodNumber - absoluteOffset;

    // validateExtraPayments ya garantizó periodNumber <= plazo original. Si el
    // periodo cae fuera del segmento vigente en este punto del fold, solo puede
    // deberse a que el préstamo ya terminó antes (abono/estrategia previa) — se
    // omite silenciosamente en vez de tratarlo como error del usuario.
    if (relativeN < 1 || relativeN > segmentTermBudget) {
      continue;
    }

    const segmentRows = system.generate({
      principal: segmentPrincipal,
      monthlyRate,
      term: Term.ofMonths(segmentTermBudget),
      startDate: segmentStartDate,
    });

    const firmRows = segmentRows.slice(0, relativeN);
    const paymentRowIndex = relativeN - 1;
    const paymentRow = firmRows[paymentRowIndex];
    if (paymentRow === undefined) {
      continue;
    }

    const balanceBeforePayment = paymentRow.remainingBalance;
    const cappedAmount = payment.amount.greaterThan(balanceBeforePayment)
      ? balanceBeforePayment
      : payment.amount;
    const balanceAfterPayment = balanceBeforePayment.subtract(cappedAmount);

    for (let i = 0; i < firmRows.length; i++) {
      const row = firmRows[i] as (typeof firmRows)[number];
      const periodNumber = absoluteOffset + i + 1;
      const isPaymentRow = i === paymentRowIndex;

      advancedRows.push({
        ...row,
        periodNumber,
        extraPayment: isPaymentRow ? cappedAmount : Money.zero(currency),
        totalPrincipalPaid: isPaymentRow ? row.principalPaid.add(cappedAmount) : row.principalPaid,
        remainingBalance: isPaymentRow ? balanceAfterPayment : row.remainingBalance,
      });
    }

    absoluteOffset += relativeN;

    if (balanceAfterPayment.isZero()) {
      earlyPayoff = true;
      break;
    }

    const remainingOriginalPeriods = totalPeriods - payment.periodNumber;
    const nextTermBudget = strategy.computeNextTermMonths({
      system,
      newPrincipal: balanceAfterPayment,
      monthlyRate,
      referenceInstallment: paymentRow.installment,
      remainingOriginalPeriods,
    });

    segmentPrincipal = balanceAfterPayment;
    segmentStartDate = addMonths(startDate, payment.periodNumber);
    segmentTermBudget = nextTermBudget;
  }

  if (!earlyPayoff) {
    const finalSegmentRows = system.generate({
      principal: segmentPrincipal,
      monthlyRate,
      term: Term.ofMonths(segmentTermBudget),
      startDate: segmentStartDate,
    });

    finalSegmentRows.forEach((row, index) => {
      advancedRows.push({
        ...row,
        periodNumber: absoluteOffset + index + 1,
        extraPayment: Money.zero(currency),
        totalPrincipalPaid: row.principalPaid,
      });
    });
  }

  const totalPrincipal = advancedRows.reduce(
    (acc, row) => acc.add(row.totalPrincipalPaid),
    Money.zero(currency),
  );
  const totalInterest = advancedRows.reduce(
    (acc, row) => acc.add(row.interest),
    Money.zero(currency),
  );
  const totalPaid = totalPrincipal.add(totalInterest);

  const summary = buildSummary(
    advancedRows as unknown as NonEmptySchedule,
    totalPrincipal,
    totalInterest,
    totalPaid,
    advancedRows.length,
  );

  const interestSaved = baseline.summary.totalInterest.subtract(totalInterest);
  if (interestSaved.isNegative()) {
    throw new InvalidInputError(
      'Extra payments produced more total interest than the baseline schedule',
      'interestSaved',
      interestSaved.toString(),
    );
  }

  return {
    baseline,
    withExtraPayments: { schedule: advancedRows, summary },
    interestSaved,
    monthsSaved: baseline.schedule.length - advancedRows.length,
  };
}

export const ExtraPaymentSimulator = { simulate: simulateExtraPayments } as const;
