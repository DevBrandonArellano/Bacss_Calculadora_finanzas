import { describe, it, expect } from 'vitest';
import { calculateSchedule } from './calculateSchedule';
import { FrenchAmortization } from '../../domain/loans/frenchAmortization';
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

describe('calculateSchedule (use case)', () => {
  it('debe devolver el AmortizationResult cuando la petición es válida', () => {
    const logger = new FakeLogger();
    const result = calculateSchedule(
      {
        system: new FrenchAmortization(),
        principal: Money.of('10000', 'USD'),
        annualRate: InterestRate.fromPercentage('12'),
        rateConversionMethod: 'nominal',
        term: Term.ofMonths(12),
        startDate: START_DATE,
      },
      logger,
    );

    expect(result.summary.installment?.toFixed(2)).toBe('888.49');
    expect(logger.entries).toHaveLength(0);
  });

  it('debe loguear con severidad error y re-lanzar cuando el dominio lanza un DomainError', () => {
    const logger = new FakeLogger();

    expect(() =>
      calculateSchedule(
        {
          system: new FrenchAmortization(),
          principal: Money.zero('USD'),
          annualRate: InterestRate.fromPercentage('12'),
          rateConversionMethod: 'nominal',
          term: Term.ofMonths(12),
          startDate: START_DATE,
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
      calculateSchedule(
        {
          system: brokenSystem,
          principal: Money.of('10000', 'USD'),
          annualRate: InterestRate.fromPercentage('12'),
          rateConversionMethod: 'nominal',
          term: Term.ofMonths(12),
          startDate: START_DATE,
        },
        logger,
      ),
    ).toThrow('boom');

    expect(logger.entries).toHaveLength(0);
  });
});
