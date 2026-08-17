import { describe, it, expect } from 'vitest';
import { FrenchAmortization } from './frenchAmortization';
import { GermanAmortization } from './germanAmortization';
import { AmortizationEngine } from './amortizationEngine';
import { Money } from '../shared/money';
import { Term } from '../shared/term';
import { InterestRate } from '../shared/interestRate';

const START_DATE = new Date('2026-01-15T00:00:00.000Z');

function must<T>(value: T | undefined): T {
  if (value === undefined) {
    throw new Error('Unexpected undefined value in test');
  }
  return value;
}

describe('Caso 13 — comparación francés vs alemán (mismos datos, distinto sistema)', () => {
  it('debe producir menos interés total en alemán que en francés para los mismos parámetros', () => {
    const principal = Money.of('10000', 'USD');
    const annualRate = InterestRate.fromPercentage('12');
    const term = Term.ofMonths(12);

    const frenchResult = AmortizationEngine.run({
      system: new FrenchAmortization(),
      principal,
      annualRate,
      rateConversionMethod: 'nominal',
      term,
      startDate: START_DATE,
    });

    const germanResult = AmortizationEngine.run({
      system: new GermanAmortization(),
      principal,
      annualRate,
      rateConversionMethod: 'nominal',
      term,
      startDate: START_DATE,
    });

    // Propiedad matemática general (no específica de estos números): en alemán el capital
    // se amortiza más rápido en los primeros periodos (capital constante desde el mes 1,
    // vs francés que crece progresivamente), por lo que el saldo sobre el que se calcula
    // interés cae más rápido y el interés total acumulado es menor.
    expect(germanResult.summary.totalInterest.lessThan(frenchResult.summary.totalInterest)).toBe(
      true,
    );

    // Valores exactos verificados independientemente (Casos 1 y 2 de las fases 2 y 3).
    expect(frenchResult.summary.totalInterest.toFixed(2)).toBe('661.86');
    expect(germanResult.summary.totalInterest.toFixed(2)).toBe('650.00');

    // Ambos sistemas: mismo principal total, mismo número de periodos, saldo final en 0.
    expect(frenchResult.summary.totalPrincipal.equals(principal)).toBe(true);
    expect(germanResult.summary.totalPrincipal.equals(principal)).toBe(true);
    expect(frenchResult.schedule).toHaveLength(germanResult.schedule.length);
    expect(must(frenchResult.schedule.at(-1)).remainingBalance.isZero()).toBe(true);
    expect(must(germanResult.schedule.at(-1)).remainingBalance.isZero()).toBe(true);
  });
});
