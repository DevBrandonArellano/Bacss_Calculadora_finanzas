import { describe, it, expect } from 'vitest';
import { simulateExtraPayments } from './simulateExtraPayments';
import { FrenchAmortization } from '../../domain/loans/frenchAmortization';
import { ReducePaymentStrategy } from '../../domain/loans/extra-payments/reducePaymentStrategy';
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

describe('simulateExtraPayments (use case)', () => {
  it('debe devolver ExtraPaymentComparison cuando la petición es válida', () => {
    const logger = new FakeLogger();
    const result = simulateExtraPayments(
      {
        baseRequest: {
          system: new FrenchAmortization(),
          principal: Money.of('10000', 'USD'),
          annualRate: InterestRate.fromPercentage('12'),
          rateConversionMethod: 'nominal',
          term: Term.ofMonths(12),
          startDate: START_DATE,
        },
        strategy: new ReducePaymentStrategy(),
        extraPayments: [{ periodNumber: 3, amount: Money.of('2000', 'USD') }],
      },
      logger,
    );

    expect(result.interestSaved.isPositive()).toBe(true);
    expect(logger.entries).toHaveLength(0);
  });

  it('debe loguear con severidad error y re-lanzar cuando el dominio lanza un DomainError', () => {
    const logger = new FakeLogger();

    expect(() =>
      simulateExtraPayments(
        {
          baseRequest: {
            system: new FrenchAmortization(),
            principal: Money.of('10000', 'USD'),
            annualRate: InterestRate.fromPercentage('12'),
            rateConversionMethod: 'nominal',
            term: Term.ofMonths(12),
            startDate: START_DATE,
          },
          strategy: new ReducePaymentStrategy(),
          extraPayments: [{ periodNumber: 99, amount: Money.of('2000', 'USD') }],
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
      simulateExtraPayments(
        {
          baseRequest: {
            system: brokenSystem,
            principal: Money.of('10000', 'USD'),
            annualRate: InterestRate.fromPercentage('12'),
            rateConversionMethod: 'nominal',
            term: Term.ofMonths(12),
            startDate: START_DATE,
          },
          strategy: new ReducePaymentStrategy(),
          extraPayments: [{ periodNumber: 3, amount: Money.of('2000', 'USD') }],
        },
        logger,
      ),
    ).toThrow('boom');

    expect(logger.entries).toHaveLength(0);
  });
});
