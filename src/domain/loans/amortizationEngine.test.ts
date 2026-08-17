import { describe, it, expect } from 'vitest';
import { AmortizationEngine } from './amortizationEngine';
import { FrenchAmortization } from './frenchAmortization';
import { Money } from '../shared/money';
import { InterestRate } from '../shared/interestRate';
import { Term } from '../shared/term';
import { InvalidInputError } from '../shared/errors';
import type { AmortizationSystem } from './amortizationSystem';
import type { AmortizationRow } from './amortizationRow';

const START_DATE = new Date('2026-01-15T00:00:00.000Z');

function must<T>(value: T | undefined | null): T {
  if (value === undefined || value === null) {
    throw new Error('Unexpected undefined/null value in test');
  }
  return value;
}

describe('AmortizationEngine — caso feliz', () => {
  it('debe producir un resultado cuyo totalPrincipal iguala el principal y saldo final es cero', () => {
    const principal = Money.of('10000', 'USD');
    const result = AmortizationEngine.run({
      system: new FrenchAmortization(),
      principal,
      annualRate: InterestRate.fromPercentage('12'),
      rateConversionMethod: 'nominal',
      term: Term.ofMonths(12),
      startDate: START_DATE,
    });

    expect(result.summary.totalPrincipal.equals(principal)).toBe(true);
    expect(must(result.schedule.at(-1)).remainingBalance.isZero()).toBe(true);
  });

  it('debe cumplir totalPaid = totalPrincipal + totalInterest', () => {
    const result = AmortizationEngine.run({
      system: new FrenchAmortization(),
      principal: Money.of('10000', 'USD'),
      annualRate: InterestRate.fromPercentage('12'),
      rateConversionMethod: 'nominal',
      term: Term.ofMonths(12),
      startDate: START_DATE,
    });

    const expectedTotal = result.summary.totalPrincipal.add(result.summary.totalInterest);
    expect(result.summary.totalPaid.equals(expectedTotal)).toBe(true);
  });

  it('debe exponer installment con la cuota constante calculada', () => {
    const result = AmortizationEngine.run({
      system: new FrenchAmortization(),
      principal: Money.of('10000', 'USD'),
      annualRate: InterestRate.fromPercentage('12'),
      rateConversionMethod: 'nominal',
      term: Term.ofMonths(12),
      startDate: START_DATE,
    });

    expect(result.summary.installment).not.toBeNull();
    expect(must(result.summary.installment).toFixed(2)).toBe('888.49');
  });

  it('debe exponer termInMonths igual al plazo solicitado', () => {
    const result = AmortizationEngine.run({
      system: new FrenchAmortization(),
      principal: Money.of('10000', 'USD'),
      annualRate: InterestRate.fromPercentage('12'),
      rateConversionMethod: 'nominal',
      term: Term.ofMonths(12),
      startDate: START_DATE,
    });

    expect(result.summary.termInMonths).toBe(12);
  });
});

describe('AmortizationEngine — validación de entrada', () => {
  it('debe lanzar un error cuando el principal no es positivo', () => {
    expect(() =>
      AmortizationEngine.run({
        system: new FrenchAmortization(),
        principal: Money.zero('USD'),
        annualRate: InterestRate.fromPercentage('12'),
        rateConversionMethod: 'nominal',
        term: Term.ofMonths(12),
        startDate: START_DATE,
      }),
    ).toThrow(InvalidInputError);
  });
});

describe('AmortizationEngine — parametrización nominal vs efectiva', () => {
  it('debe producir una cuota mensual distinta entre nominal y effective para la misma tasa anual', () => {
    const baseRequest = {
      system: new FrenchAmortization(),
      principal: Money.of('10000', 'USD'),
      annualRate: InterestRate.fromPercentage('12'),
      term: Term.ofMonths(12),
      startDate: START_DATE,
    };

    const nominalResult = AmortizationEngine.run({
      ...baseRequest,
      rateConversionMethod: 'nominal',
    });
    const effectiveResult = AmortizationEngine.run({
      ...baseRequest,
      rateConversionMethod: 'effective',
    });

    expect(
      must(nominalResult.summary.installment).equals(must(effectiveResult.summary.installment)),
    ).toBe(false);
  });
});

describe('AmortizationEngine — assert interno del DoD', () => {
  it('debe lanzar InvalidInputError cuando la estrategia devuelve un schedule con saldo final distinto de cero', () => {
    const brokenSystem: AmortizationSystem = {
      generate(): readonly AmortizationRow[] {
        return [
          {
            periodNumber: 1,
            date: START_DATE,
            installment: Money.of('100', 'USD'),
            interest: Money.of('10', 'USD'),
            principalPaid: Money.of('90', 'USD'),
            // Deliberadamente roto: el saldo no llega a 0 aunque el principal era 100.
            remainingBalance: Money.of('10', 'USD'),
          },
        ];
      },
    };

    expect(() =>
      AmortizationEngine.run({
        system: brokenSystem,
        principal: Money.of('100', 'USD'),
        annualRate: InterestRate.fromPercentage('12'),
        rateConversionMethod: 'nominal',
        term: Term.ofMonths(1),
        startDate: START_DATE,
      }),
    ).toThrow(InvalidInputError);
  });

  it('debe lanzar InvalidInputError cuando la suma de capital no iguala el principal', () => {
    const brokenSystem: AmortizationSystem = {
      generate(): readonly AmortizationRow[] {
        return [
          {
            periodNumber: 1,
            date: START_DATE,
            installment: Money.of('100', 'USD'),
            interest: Money.of('10', 'USD'),
            // Deliberadamente roto: principalPaid no suma el principal (100), pero balance sí da 0.
            principalPaid: Money.of('80', 'USD'),
            remainingBalance: Money.zero('USD'),
          },
        ];
      },
    };

    expect(() =>
      AmortizationEngine.run({
        system: brokenSystem,
        principal: Money.of('100', 'USD'),
        annualRate: InterestRate.fromPercentage('12'),
        rateConversionMethod: 'nominal',
        term: Term.ofMonths(1),
        startDate: START_DATE,
      }),
    ).toThrow(InvalidInputError);
  });
});
