import { describe, it, expect } from 'vitest';
import { expandRecurringContribution } from './recurringContribution';
import { Money } from '../../shared/money';
import { InvalidInputError } from '../../shared/errors';

describe('expandRecurringContribution', () => {
  it('debe generar un ExtraPayment por cada periodo en el rango, con el mismo monto', () => {
    const result = expandRecurringContribution({
      amount: Money.of('100', 'USD'),
      startPeriod: 3,
      endPeriod: 6,
    });

    expect(result).toHaveLength(4);
    expect(result.map((p) => p.periodNumber)).toEqual([3, 4, 5, 6]);
    for (const payment of result) {
      expect(payment.amount.toFixed(2)).toBe('100.00');
    }
  });

  it('debe generar un único ExtraPayment cuando startPeriod === endPeriod', () => {
    const result = expandRecurringContribution({
      amount: Money.of('50', 'USD'),
      startPeriod: 5,
      endPeriod: 5,
    });
    expect(result).toHaveLength(1);
    expect(result[0]?.periodNumber).toBe(5);
  });

  it('debe lanzar InvalidInputError cuando startPeriod no es entero', () => {
    expect(() =>
      expandRecurringContribution({
        amount: Money.of('50', 'USD'),
        startPeriod: 1.5,
        endPeriod: 5,
      }),
    ).toThrow(InvalidInputError);
  });

  it('debe lanzar InvalidInputError cuando startPeriod es menor que 1', () => {
    expect(() =>
      expandRecurringContribution({ amount: Money.of('50', 'USD'), startPeriod: 0, endPeriod: 5 }),
    ).toThrow(InvalidInputError);
  });

  it('debe lanzar InvalidInputError cuando endPeriod es menor que startPeriod', () => {
    expect(() =>
      expandRecurringContribution({ amount: Money.of('50', 'USD'), startPeriod: 5, endPeriod: 3 }),
    ).toThrow(InvalidInputError);
  });
});
