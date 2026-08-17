import { describe, it, expect } from 'vitest';
import { compareDebtVsInvestment } from './compareDebtVsInvestment';
import { Money } from '../../domain/shared/money';
import { InterestRate } from '../../domain/shared/interestRate';
import type { Logger, LogEntry } from '../ports/logger';
import type { AmortizationSystem } from '../../domain/loans/amortizationSystem';

const START_DATE = new Date('2026-01-15T00:00:00.000Z');

class FakeLogger implements Logger {
  readonly entries: Omit<LogEntry, 'timestamp'>[] = [];
  log(entry: Omit<LogEntry, 'timestamp'>): void {
    this.entries.push(entry);
  }
}

describe('compareDebtVsInvestment (use case)', () => {
  it('debe devolver DebtVsInvestmentResult con el disclaimer siempre presente', () => {
    const logger = new FakeLogger();
    const result = compareDebtVsInvestment(
      {
        availableAmount: Money.of('5000', 'USD'),
        loanPrincipal: Money.of('10000', 'USD'),
        loanAnnualRate: InterestRate.fromPercentage('12'),
        loanRateConversionMethod: 'nominal',
        loanTermMonths: 12,
        loanStartDate: START_DATE,
        investment: {
          initialAmount: Money.of('5000', 'USD'),
          monthlyContribution: Money.zero('USD'),
          annualReturnRate: InterestRate.fromPercentage('8'),
          rateConversionMethod: 'nominal',
          months: 12,
        },
      },
      logger,
    );

    expect(result.disclaimer.length).toBeGreaterThan(0);
    expect(logger.entries).toHaveLength(0);
  });

  it('debe loguear con severidad error y re-lanzar cuando el dominio lanza un DomainError', () => {
    const logger = new FakeLogger();

    expect(() =>
      compareDebtVsInvestment(
        {
          availableAmount: Money.of('5000', 'USD'),
          loanPrincipal: Money.zero('USD'),
          loanAnnualRate: InterestRate.fromPercentage('12'),
          loanRateConversionMethod: 'nominal',
          loanTermMonths: 12,
          loanStartDate: START_DATE,
          investment: {
            initialAmount: Money.of('5000', 'USD'),
            monthlyContribution: Money.zero('USD'),
            annualReturnRate: InterestRate.fromPercentage('8'),
            rateConversionMethod: 'nominal',
            months: 12,
          },
        },
        logger,
      ),
    ).toThrow();

    expect(logger.entries).toHaveLength(1);
    expect(logger.entries[0]?.severity).toBe('error');
  });

  it('debe re-lanzar sin loguear cuando el error no es un DomainError', () => {
    const logger = new FakeLogger();
    const brokenSystem: AmortizationSystem = {
      generate: () => {
        throw new Error('boom');
      },
    };

    expect(() =>
      compareDebtVsInvestment(
        {
          availableAmount: Money.of('5000', 'USD'),
          loanPrincipal: Money.of('10000', 'USD'),
          loanAnnualRate: InterestRate.fromPercentage('12'),
          loanRateConversionMethod: 'nominal',
          loanTermMonths: 12,
          loanStartDate: START_DATE,
          system: brokenSystem,
          investment: {
            initialAmount: Money.of('5000', 'USD'),
            monthlyContribution: Money.zero('USD'),
            annualReturnRate: InterestRate.fromPercentage('8'),
            rateConversionMethod: 'nominal',
            months: 12,
          },
        },
        logger,
      ),
    ).toThrow('boom');

    expect(logger.entries).toHaveLength(0);
  });
});
