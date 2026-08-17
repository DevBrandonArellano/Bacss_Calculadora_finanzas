import { describe, it, expect } from 'vitest';
import { compareScenarios } from './compareScenarios';
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

describe('compareScenarios (use case)', () => {
  it('debe devolver ScenarioComparisonResult cuando hay al menos un escenario', () => {
    const logger = new FakeLogger();
    const result = compareScenarios(
      [
        {
          label: 'A',
          request: {
            system: new FrenchAmortization(),
            principal: Money.of('10000', 'USD'),
            annualRate: InterestRate.fromPercentage('12'),
            rateConversionMethod: 'nominal',
            term: Term.ofMonths(12),
            startDate: START_DATE,
          },
        },
      ],
      logger,
    );

    expect(result.rows).toHaveLength(1);
    expect(logger.entries).toHaveLength(0);
  });

  it('debe loguear con severidad error y re-lanzar cuando la lista está vacía', () => {
    const logger = new FakeLogger();
    expect(() => compareScenarios([], logger)).toThrow();
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
      compareScenarios(
        [
          {
            label: 'A',
            request: {
              system: brokenSystem,
              principal: Money.of('10000', 'USD'),
              annualRate: InterestRate.fromPercentage('12'),
              rateConversionMethod: 'nominal',
              term: Term.ofMonths(12),
              startDate: START_DATE,
            },
          },
        ],
        logger,
      ),
    ).toThrow('boom');

    expect(logger.entries).toHaveLength(0);
  });
});
