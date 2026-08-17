import type { AmortizationRow } from '../../../domain/loans/amortizationRow';
import type { AdvancedAmortizationRow } from '../../../domain/loans/extra-payments/advancedAmortizationRow';
import type { AmortizationSummary } from '../../../domain/loans/amortizationEngine';
import type { Money } from '../../../domain/shared/money';

export interface BalancePoint {
  readonly period: number;
  readonly balance: number;
}

export interface InstallmentBreakdownPoint {
  readonly period: number;
  readonly interest: number;
  readonly principal: number;
}

export interface CapitalInterestTotals {
  readonly capital: number;
  readonly interest: number;
}

export interface SavingsSummary {
  readonly interestSaved: number;
  readonly monthsSaved: number;
}

export interface SystemComparisonPoint {
  readonly period: number;
  readonly french: number;
  readonly german: number;
}

export interface StrategyComparisonPoint {
  readonly period: number;
  readonly reduceTerm: number;
  readonly reducePayment: number;
}

export function toBalancePoints(rows: readonly AmortizationRow[]): BalancePoint[] {
  return rows.map((row) => ({
    period: row.periodNumber,
    balance: row.remainingBalance.toNumber(),
  }));
}

export function toInstallmentBreakdown(
  rows: readonly (AmortizationRow | AdvancedAmortizationRow)[],
): InstallmentBreakdownPoint[] {
  return rows.map((row) => ({
    period: row.periodNumber,
    interest: row.interest.toNumber(),
    principal: row.principalPaid.toNumber(),
  }));
}

export function toCapitalInterestTotals(summary: AmortizationSummary): CapitalInterestTotals {
  return {
    capital: summary.totalPrincipal.toNumber(),
    interest: summary.totalInterest.toNumber(),
  };
}

export function toSavingsSummary(interestSaved: Money, monthsSaved: number): SavingsSummary {
  return { interestSaved: interestSaved.toNumber(), monthsSaved };
}

export function formatCurrency(value: number): string {
  return value.toFixed(2);
}

export function toSystemComparisonPoints(
  frenchRows: readonly AmortizationRow[],
  germanRows: readonly AmortizationRow[],
): SystemComparisonPoint[] {
  const length = Math.max(frenchRows.length, germanRows.length);
  const points: SystemComparisonPoint[] = [];

  for (let index = 0; index < length; index++) {
    points.push({
      period: index + 1,
      french: frenchRows[index]?.remainingBalance.toNumber() ?? 0,
      german: germanRows[index]?.remainingBalance.toNumber() ?? 0,
    });
  }

  return points;
}

export function toStrategyComparisonPoints(
  reduceTermRows: readonly (AmortizationRow | AdvancedAmortizationRow)[],
  reducePaymentRows: readonly (AmortizationRow | AdvancedAmortizationRow)[],
): StrategyComparisonPoint[] {
  const length = Math.max(reduceTermRows.length, reducePaymentRows.length);
  const points: StrategyComparisonPoint[] = [];

  for (let index = 0; index < length; index++) {
    points.push({
      period: index + 1,
      reduceTerm: reduceTermRows[index]?.installment.toNumber() ?? 0,
      reducePayment: reducePaymentRows[index]?.installment.toNumber() ?? 0,
    });
  }

  return points;
}
