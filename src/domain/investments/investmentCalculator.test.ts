import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';
import { calculateFutureValue } from './investmentCalculator';
import { Money } from '../shared/money';
import { InterestRate } from '../shared/interestRate';

describe('calculateFutureValue', () => {
  it('debe calcular el valor futuro con aportes mensuales (verificado independientemente)', () => {
    const result = calculateFutureValue({
      initialAmount: Money.of('5000', 'USD'),
      monthlyContribution: Money.of('100', 'USD'),
      annualReturnRate: InterestRate.fromPercentage('8'),
      rateConversionMethod: 'nominal',
      months: 12,
    });

    expect(result.futureValueGross.toFixed(2)).toBe('6659.99');
    expect(result.totalContributed.toFixed(2)).toBe('6200.00');
    expect(result.futureValueNet.toFixed(2)).toBe('6659.99'); // sin impuestos/comisiones
  });

  it('debe calcular el valor futuro sin aportes mensuales cuando monthlyContribution es cero', () => {
    const result = calculateFutureValue({
      initialAmount: Money.of('5000', 'USD'),
      monthlyContribution: Money.zero('USD'),
      annualReturnRate: InterestRate.fromPercentage('8'),
      rateConversionMethod: 'nominal',
      months: 12,
    });

    expect(result.futureValueGross.toFixed(2)).toBe('5415.00');
    expect(result.totalContributed.toFixed(2)).toBe('5000.00');
  });

  it('debe manejar el caso especial de rendimiento 0% (FV = aportado exacto)', () => {
    const result = calculateFutureValue({
      initialAmount: Money.of('1000', 'USD'),
      monthlyContribution: Money.of('50', 'USD'),
      annualReturnRate: InterestRate.fromPercentage('0'),
      rateConversionMethod: 'nominal',
      months: 10,
    });

    expect(result.futureValueGross.toFixed(2)).toBe('1500.00');
    expect(result.totalContributed.toFixed(2)).toBe('1500.00');
  });

  it('debe aplicar comisión y descontar impuesto sobre la ganancia cuando se proveen', () => {
    const result = calculateFutureValue({
      initialAmount: Money.of('5000', 'USD'),
      monthlyContribution: Money.of('100', 'USD'),
      annualReturnRate: InterestRate.fromPercentage('8'),
      rateConversionMethod: 'nominal',
      months: 12,
      feeRate: new Decimal('0.01'),
      taxRate: new Decimal('0.15'),
    });

    expect(result.futureValueNet.toFixed(2)).toBe('6534.38');
  });

  it('no debe aplicar impuesto cuando la ganancia neta es negativa o cero', () => {
    const result = calculateFutureValue({
      initialAmount: Money.of('1000', 'USD'),
      monthlyContribution: Money.zero('USD'),
      annualReturnRate: InterestRate.fromPercentage('0'),
      rateConversionMethod: 'nominal',
      months: 1,
      feeRate: new Decimal('0.5'),
      taxRate: new Decimal('0.15'),
    });

    // FV bruto = 1000, tras comisión 50% = 500, ganancia = 500-1000 = -500 (pérdida) => sin impuesto
    expect(result.futureValueNet.toFixed(2)).toBe('500.00');
  });

  describe('roi', () => {
    it('debe calcular el ROI simple total como (futureValueNet - totalContributed) / totalContributed', () => {
      const result = calculateFutureValue({
        initialAmount: Money.of('5000', 'USD'),
        monthlyContribution: Money.of('100', 'USD'),
        annualReturnRate: InterestRate.fromPercentage('8'),
        rateConversionMethod: 'nominal',
        months: 12,
      });

      expect(result.roi?.toFixed(4)).toBe('0.0742');
    });

    it('debe calcular el ROI sobre el valor futuro neto (después de comisión e impuestos)', () => {
      const result = calculateFutureValue({
        initialAmount: Money.of('5000', 'USD'),
        monthlyContribution: Money.of('100', 'USD'),
        annualReturnRate: InterestRate.fromPercentage('8'),
        rateConversionMethod: 'nominal',
        months: 12,
        feeRate: new Decimal('0.01'),
        taxRate: new Decimal('0.15'),
      });

      expect(result.roi?.toFixed(4)).toBe('0.0539');
    });

    it('debe devolver un ROI negativo cuando la inversión pierde valor', () => {
      const result = calculateFutureValue({
        initialAmount: Money.of('1000', 'USD'),
        monthlyContribution: Money.zero('USD'),
        annualReturnRate: InterestRate.fromPercentage('0'),
        rateConversionMethod: 'nominal',
        months: 1,
        feeRate: new Decimal('0.5'),
        taxRate: new Decimal('0.15'),
      });

      expect(result.roi?.toFixed(4)).toBe('-0.5000');
    });

    it('debe devolver null cuando el total aportado es cero (ROI no definido, evita división por cero)', () => {
      const result = calculateFutureValue({
        initialAmount: Money.zero('USD'),
        monthlyContribution: Money.zero('USD'),
        annualReturnRate: InterestRate.fromPercentage('8'),
        rateConversionMethod: 'nominal',
        months: 12,
      });

      expect(result.roi).toBeNull();
    });
  });
});
