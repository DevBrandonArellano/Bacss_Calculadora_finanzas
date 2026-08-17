import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';
import { ReduceTermStrategy } from './reduceTermStrategy';
import { FrenchAmortization } from '../frenchAmortization';
import { GermanAmortization } from '../germanAmortization';
import { Money } from '../../shared/money';

describe('ReduceTermStrategy', () => {
  it('debe tener name "reduce-term"', () => {
    const strategy = new ReduceTermStrategy();
    expect(strategy.name).toBe('reduce-term');
  });

  it('debe encontrar el menor plazo cuya cuota no exceda la cuota de referencia (Caso 4, francés)', () => {
    const strategy = new ReduceTermStrategy();
    const result = strategy.computeNextTermMonths({
      system: new FrenchAmortization(),
      newPrincipal: Money.of('5610.80', 'USD'),
      monthlyRate: new Decimal('0.01'),
      referenceInstallment: Money.of('888.49', 'USD'),
      remainingOriginalPeriods: 9,
    });
    expect(result).toBe(7);
  });

  it('debe devolver remainingOriginalPeriods cuando ni siquiera ese plazo excede la cuota de referencia', () => {
    const strategy = new ReduceTermStrategy();
    const result = strategy.computeNextTermMonths({
      system: new FrenchAmortization(),
      newPrincipal: Money.of('100', 'USD'),
      monthlyRate: new Decimal('0.01'),
      referenceInstallment: Money.of('888.49', 'USD'),
      remainingOriginalPeriods: 9,
    });
    expect(result).toBe(1);
  });

  it('debe funcionar también con el sistema alemán (agnóstico al sistema)', () => {
    const strategy = new ReduceTermStrategy();
    const result = strategy.computeNextTermMonths({
      system: new GermanAmortization(),
      newPrincipal: Money.of('5610.80', 'USD'),
      monthlyRate: new Decimal('0.01'),
      referenceInstallment: Money.of('1000', 'USD'),
      remainingOriginalPeriods: 9,
    });
    expect(result).toBeGreaterThanOrEqual(1);
    expect(result).toBeLessThanOrEqual(9);
  });
});
