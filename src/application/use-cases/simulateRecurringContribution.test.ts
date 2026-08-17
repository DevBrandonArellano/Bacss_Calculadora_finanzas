import { describe, it, expect } from 'vitest';
import { simulateRecurringContribution } from './simulateRecurringContribution';
import { FrenchAmortization } from '../../domain/loans/frenchAmortization';
import { ReduceTermStrategy } from '../../domain/loans/extra-payments/reduceTermStrategy';
import { Money } from '../../domain/shared/money';
import { InterestRate } from '../../domain/shared/interestRate';
import { Term } from '../../domain/shared/term';
import type { Logger, LogEntry } from '../ports/logger';
import type { AmortizationSystem } from '../../domain/loans/amortizationSystem';

const START_DATE = new Date('2026-01-15T00:00:00.000Z');

class FakeLogger implements Logger {
  readonly entries: Omit<LogEntry, 'timestamp'>[] = [];
  log(entry: Omit<LogEntry, 'timestamp'>): void {
    this.entries.push(entry);
  }
}

describe('simulateRecurringContribution (use case)', () => {
  it('debe devolver ExtraPaymentComparison con el aporte recurrente aplicado (Caso 8)', () => {
    const logger = new FakeLogger();
    const result = simulateRecurringContribution(
      {
        baseRequest: {
          system: new FrenchAmortization(),
          principal: Money.of('10000', 'USD'),
          annualRate: InterestRate.fromPercentage('12'),
          rateConversionMethod: 'nominal',
          term: Term.ofMonths(12),
          startDate: START_DATE,
        },
        strategy: new ReduceTermStrategy(),
        extraPayments: [],
        recurringContributions: [{ amount: Money.of('700', 'USD'), startPeriod: 1, endPeriod: 12 }],
      },
      logger,
    );

    expect(result.monthsSaved).toBe(4);
    expect(logger.entries).toHaveLength(0);
  });

  it('debe loguear con severidad error y re-lanzar cuando el dominio lanza un DomainError', () => {
    const logger = new FakeLogger();

    expect(() =>
      simulateRecurringContribution(
        {
          baseRequest: {
            system: new FrenchAmortization(),
            principal: Money.of('10000', 'USD'),
            annualRate: InterestRate.fromPercentage('12'),
            rateConversionMethod: 'nominal',
            term: Term.ofMonths(12),
            startDate: START_DATE,
          },
          strategy: new ReduceTermStrategy(),
          extraPayments: [],
          recurringContributions: [
            { amount: Money.of('700', 'USD'), startPeriod: 1, endPeriod: 99 },
          ],
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
      simulateRecurringContribution(
        {
          baseRequest: {
            system: brokenSystem,
            principal: Money.of('10000', 'USD'),
            annualRate: InterestRate.fromPercentage('12'),
            rateConversionMethod: 'nominal',
            term: Term.ofMonths(12),
            startDate: START_DATE,
          },
          strategy: new ReduceTermStrategy(),
          extraPayments: [],
          recurringContributions: [
            { amount: Money.of('700', 'USD'), startPeriod: 1, endPeriod: 12 },
          ],
        },
        logger,
      ),
    ).toThrow('boom');

    expect(logger.entries).toHaveLength(0);
  });
});
