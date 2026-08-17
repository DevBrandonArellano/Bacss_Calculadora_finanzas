import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';
import { ReducePaymentStrategy } from './reducePaymentStrategy';
import { FrenchAmortization } from '../frenchAmortization';
import { Money } from '../../shared/money';

describe('ReducePaymentStrategy', () => {
  it('debe tener name "reduce-payment"', () => {
    const strategy = new ReducePaymentStrategy();
    expect(strategy.name).toBe('reduce-payment');
  });

  it('debe devolver remainingOriginalPeriods sin importar los demás parámetros', () => {
    const strategy = new ReducePaymentStrategy();
    const result = strategy.computeNextTermMonths({
      system: new FrenchAmortization(),
      newPrincipal: Money.of('5610.80', 'USD'),
      monthlyRate: new Decimal('0.01'),
      referenceInstallment: Money.of('888.49', 'USD'),
      remainingOriginalPeriods: 9,
    });
    expect(result).toBe(9);
  });
});
