import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';
import { FrenchAmortization } from './frenchAmortization';
import { GermanAmortization } from './germanAmortization';
import { AmortizationEngine } from './amortizationEngine';
import { Money } from '../shared/money';
import { Term } from '../shared/term';
import { InterestRate } from '../shared/interestRate';
import type { AmortizationSystem } from './amortizationSystem';

const START_DATE = new Date('2026-01-15T00:00:00.000Z');

function must<T>(value: T | undefined): T {
  if (value === undefined) {
    throw new Error('Unexpected undefined value in test');
  }
  return value;
}

const systemsUnderTest: readonly (readonly [string, AmortizationSystem])[] = [
  ['FrenchAmortization', new FrenchAmortization()],
  ['GermanAmortization', new GermanAmortization()],
];

const scenarios = [
  { label: 'caso general', principal: '10000', rate: '0.01', months: 12 },
  { label: 'tasa 0%', principal: '5000', rate: '0', months: 6 },
  { label: 'plazo=1 (valor límite)', principal: '999.99', rate: '0.0083', months: 1 },
] as const;

describe.each(systemsUnderTest)('AmortizationSystem contract — %s', (_name, system) => {
  it.each(scenarios)(
    'cierra el saldo en 0 y la suma de capital = principal ($label)',
    ({ principal, rate, months }) => {
      const rows = system.generate({
        principal: Money.of(principal, 'USD'),
        monthlyRate: new Decimal(rate),
        term: Term.ofMonths(months),
        startDate: START_DATE,
      });

      const lastRow = must(rows.at(-1));
      const sumPrincipal = rows.reduce((acc, r) => acc.add(r.principalPaid), Money.zero('USD'));

      expect(rows).toHaveLength(months);
      expect(lastRow.remainingBalance.isZero()).toBe(true);
      expect(sumPrincipal.equals(Money.of(principal, 'USD'))).toBe(true);

      rows.forEach((row, i) => {
        expect(row.periodNumber).toBe(i + 1);
      });
    },
  );

  it('funciona sin cambios a través de AmortizationEngine.run (integración OCP)', () => {
    const result = AmortizationEngine.run({
      system,
      principal: Money.of('10000', 'USD'),
      annualRate: InterestRate.fromPercentage('12'),
      rateConversionMethod: 'nominal',
      term: Term.ofMonths(12),
      startDate: START_DATE,
    });

    expect(result.summary.totalPrincipal.equals(Money.of('10000', 'USD'))).toBe(true);
    expect(result.schedule).toHaveLength(12);
  });
});
