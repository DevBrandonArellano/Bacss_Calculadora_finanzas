import { Money } from '../shared/money';
import { InvalidInputError } from '../shared/errors';
import type { InterestRate, MonthlyConversionMethod } from '../shared/interestRate';
import type { Term } from '../shared/term';
import type { AmortizationSystem } from './amortizationSystem';
import type { AmortizationRow } from './amortizationRow';

export interface AmortizationRequest {
  readonly system: AmortizationSystem;
  readonly principal: Money;
  readonly annualRate: InterestRate;
  readonly rateConversionMethod: MonthlyConversionMethod;
  readonly term: Term;
  readonly startDate: Date;
}

export interface AmortizationSummary {
  readonly installment: Money | null;
  readonly totalPaid: Money;
  readonly totalInterest: Money;
  readonly totalPrincipal: Money;
  readonly termInMonths: number;
}

export interface AmortizationResult {
  readonly schedule: readonly AmortizationRow[];
  readonly summary: AmortizationSummary;
}

export type NonEmptySchedule = readonly [AmortizationRow, ...AmortizationRow[]];

export function buildSummary(
  schedule: NonEmptySchedule,
  totalPrincipal: Money,
  totalInterest: Money,
  totalPaid: Money,
  termInMonths: number,
): AmortizationSummary {
  const [firstRow] = schedule;

  const isConstantInstallment = schedule.every(
    (row, index) => index === schedule.length - 1 || row.installment.equals(firstRow.installment),
  );

  return {
    installment: isConstantInstallment ? firstRow.installment : null,
    totalPaid,
    totalInterest,
    totalPrincipal,
    termInMonths,
  };
}

export function runAmortization(request: AmortizationRequest): AmortizationResult {
  const { system, principal, annualRate, rateConversionMethod, term, startDate } = request;

  if (!principal.isPositive()) {
    throw new InvalidInputError(
      'Principal must be positive to generate an amortization schedule',
      'principal',
      principal.toString(),
    );
  }

  const monthlyRate = annualRate.toMonthly(rateConversionMethod);
  const schedule = system.generate({ principal, monthlyRate, term, startDate });

  const currency = principal.currency;
  const totalPrincipal = schedule.reduce(
    (acc, row) => acc.add(row.principalPaid),
    Money.zero(currency),
  );
  const totalInterest = schedule.reduce((acc, row) => acc.add(row.interest), Money.zero(currency));
  const totalPaid = totalPrincipal.add(totalInterest);

  const lastRow = schedule.at(-1);
  if (
    lastRow === undefined ||
    !lastRow.remainingBalance.isZero() ||
    !totalPrincipal.equals(principal)
  ) {
    throw new InvalidInputError(
      'Generated schedule does not close correctly (final balance is not zero or total principal does not match)',
      'schedule',
      undefined,
    );
  }

  // Invariante: lastRow !== undefined arriba ya garantiza schedule.length >= 1.
  const summary = buildSummary(
    schedule as NonEmptySchedule,
    totalPrincipal,
    totalInterest,
    totalPaid,
    term.toMonths(),
  );

  return { schedule, summary };
}

export const AmortizationEngine = { run: runAmortization } as const;
