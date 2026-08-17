import { describe, it, expect } from 'vitest';
import { compareScenarios } from './scenarioComparator';
import { FrenchAmortization } from '../loans/frenchAmortization';
import { GermanAmortization } from '../loans/germanAmortization';
import { Money } from '../shared/money';
import { InterestRate } from '../shared/interestRate';
import { Term } from '../shared/term';
import { InvalidInputError } from '../shared/errors';

const START_DATE = new Date('2026-01-15T00:00:00.000Z');

describe('compareScenarios', () => {
  it('debe lanzar InvalidInputError cuando la lista de escenarios está vacía', () => {
    expect(() => compareScenarios([])).toThrow(InvalidInputError);
  });

  it('debe calcular interestSavedVsBaseline como 0 para el primer escenario (es su propio baseline)', () => {
    const result = compareScenarios([
      {
        label: 'Escenario A (francés)',
        request: {
          system: new FrenchAmortization(),
          principal: Money.of('10000', 'USD'),
          annualRate: InterestRate.fromPercentage('12'),
          rateConversionMethod: 'nominal',
          term: Term.ofMonths(12),
          startDate: START_DATE,
        },
      },
    ]);

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]?.interestSavedVsBaseline.isZero()).toBe(true);
  });

  it('Caso 13 como comparador: debe mostrar ahorro positivo para el escenario alemán respecto al francés (baseline)', () => {
    const principal = Money.of('10000', 'USD');
    const annualRate = InterestRate.fromPercentage('12');
    const term = Term.ofMonths(12);

    const result = compareScenarios([
      {
        label: 'A: Francés',
        request: {
          system: new FrenchAmortization(),
          principal,
          annualRate,
          rateConversionMethod: 'nominal',
          term,
          startDate: START_DATE,
        },
      },
      {
        label: 'B: Alemán',
        request: {
          system: new GermanAmortization(),
          principal,
          annualRate,
          rateConversionMethod: 'nominal',
          term,
          startDate: START_DATE,
        },
      },
    ]);

    expect(result.rows).toHaveLength(2);
    const [rowA, rowB] = result.rows;
    expect(rowA?.totalInterest.toFixed(2)).toBe('661.86');
    expect(rowB?.totalInterest.toFixed(2)).toBe('650.00');
    expect(rowB?.interestSavedVsBaseline.toFixed(2)).toBe('11.86');
    expect(rowB?.interestSavedVsBaseline.isPositive()).toBe(true);
  });

  it('Caso 11: debe comparar escenarios con tasas distintas mostrando mayor ahorro a menor tasa', () => {
    const principal = Money.of('10000', 'USD');
    const term = Term.ofMonths(12);

    const result = compareScenarios([
      {
        label: 'A: 12% anual',
        request: {
          system: new FrenchAmortization(),
          principal,
          annualRate: InterestRate.fromPercentage('12'),
          rateConversionMethod: 'nominal',
          term,
          startDate: START_DATE,
        },
      },
      {
        label: 'B: 6% anual',
        request: {
          system: new FrenchAmortization(),
          principal,
          annualRate: InterestRate.fromPercentage('6'),
          rateConversionMethod: 'nominal',
          term,
          startDate: START_DATE,
        },
      },
    ]);

    expect(result.rows[1]?.interestSavedVsBaseline.isPositive()).toBe(true);
    expect(
      result.rows[1]?.totalInterest.lessThan(result.rows[0]?.totalInterest ?? Money.zero('USD')),
    ).toBe(true);
  });

  it('Caso 12: debe comparar escenarios con plazos distintos mostrando menor interés a menor plazo', () => {
    const principal = Money.of('10000', 'USD');
    const annualRate = InterestRate.fromPercentage('12');

    const result = compareScenarios([
      {
        label: 'A: 24 meses',
        request: {
          system: new FrenchAmortization(),
          principal,
          annualRate,
          rateConversionMethod: 'nominal',
          term: Term.ofMonths(24),
          startDate: START_DATE,
        },
      },
      {
        label: 'B: 12 meses',
        request: {
          system: new FrenchAmortization(),
          principal,
          annualRate,
          rateConversionMethod: 'nominal',
          term: Term.ofMonths(12),
          startDate: START_DATE,
        },
      },
    ]);

    expect(result.rows[1]?.termInMonths).toBe(12);
    expect(result.rows[1]?.interestSavedVsBaseline.isPositive()).toBe(true);
  });

  it('debe exponer installment no nulo para francés y termInMonths correcto para todos los escenarios', () => {
    const result = compareScenarios([
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
    ]);

    expect(result.rows[0]?.installment?.toFixed(2)).toBe('888.49');
    expect(result.rows[0]?.termInMonths).toBe(12);
  });
});
