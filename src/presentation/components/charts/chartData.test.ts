import { describe, it, expect } from 'vitest';
import {
  toBalancePoints,
  toInstallmentBreakdown,
  toCapitalInterestTotals,
  toSavingsSummary,
  toSystemComparisonPoints,
  toStrategyComparisonPoints,
  formatCurrency,
} from './chartData';
import { FrenchAmortization } from '../../../domain/loans/frenchAmortization';
import { GermanAmortization } from '../../../domain/loans/germanAmortization';
import { AmortizationEngine } from '../../../domain/loans/amortizationEngine';
import { Money } from '../../../domain/shared/money';
import { InterestRate } from '../../../domain/shared/interestRate';
import { Term } from '../../../domain/shared/term';
import Decimal from 'decimal.js';

const START_DATE = new Date('2026-01-15T00:00:00.000Z');

describe('chartData', () => {
  describe('toBalancePoints', () => {
    it('debe mapear cada fila a un punto {period, balance}', () => {
      const rows = new FrenchAmortization().generate({
        principal: Money.of('1000', 'USD'),
        monthlyRate: new Decimal('0.01'),
        term: Term.ofMonths(2),
        startDate: START_DATE,
      });

      const points = toBalancePoints(rows);

      expect(points).toHaveLength(2);
      expect(points[0]).toEqual({ period: 1, balance: rows[0]?.remainingBalance.toNumber() });
      expect(points[1]).toEqual({ period: 2, balance: 0 });
    });

    it('debe devolver un arreglo vacío cuando no hay filas', () => {
      expect(toBalancePoints([])).toEqual([]);
    });
  });

  describe('toInstallmentBreakdown', () => {
    it('debe mapear cada fila a {period, interest, principal}', () => {
      const rows = new FrenchAmortization().generate({
        principal: Money.of('1000', 'USD'),
        monthlyRate: new Decimal('0.01'),
        term: Term.ofMonths(2),
        startDate: START_DATE,
      });

      const breakdown = toInstallmentBreakdown(rows);

      expect(breakdown).toHaveLength(2);
      expect(breakdown[0]).toEqual({
        period: 1,
        interest: rows[0]?.interest.toNumber(),
        principal: rows[0]?.principalPaid.toNumber(),
      });
    });
  });

  describe('toCapitalInterestTotals', () => {
    it('debe extraer capital e interés total del summary', () => {
      const result = AmortizationEngine.run({
        system: new FrenchAmortization(),
        principal: Money.of('10000', 'USD'),
        annualRate: InterestRate.fromPercentage('12'),
        rateConversionMethod: 'nominal',
        term: Term.ofMonths(12),
        startDate: START_DATE,
      });

      const totals = toCapitalInterestTotals(result.summary);

      expect(totals).toEqual({
        capital: result.summary.totalPrincipal.toNumber(),
        interest: result.summary.totalInterest.toNumber(),
      });
    });
  });

  describe('toSavingsSummary', () => {
    it('debe convertir interestSaved (Money) y monthsSaved a números planos', () => {
      const summary = toSavingsSummary(Money.of('1234.56', 'USD'), 5);

      expect(summary).toEqual({ interestSaved: 1234.56, monthsSaved: 5 });
    });
  });

  describe('toSystemComparisonPoints', () => {
    it('debe combinar los saldos de ambos sistemas por periodo', () => {
      const frenchRows = new FrenchAmortization().generate({
        principal: Money.of('10000', 'USD'),
        monthlyRate: new Decimal('0.01'),
        term: Term.ofMonths(3),
        startDate: START_DATE,
      });
      const germanRows = new GermanAmortization().generate({
        principal: Money.of('10000', 'USD'),
        monthlyRate: new Decimal('0.01'),
        term: Term.ofMonths(3),
        startDate: START_DATE,
      });

      const points = toSystemComparisonPoints(frenchRows, germanRows);

      expect(points).toHaveLength(3);
      expect(points[0]).toEqual({
        period: 1,
        french: frenchRows[0]?.remainingBalance.toNumber(),
        german: germanRows[0]?.remainingBalance.toNumber(),
      });
      expect(points[2]).toEqual({ period: 3, french: 0, german: 0 });
    });

    it('debe rellenar con 0 cuando los sistemas tienen distinta cantidad de periodos', () => {
      const frenchRows = new FrenchAmortization().generate({
        principal: Money.of('1000', 'USD'),
        monthlyRate: new Decimal('0.01'),
        term: Term.ofMonths(2),
        startDate: START_DATE,
      });

      const points = toSystemComparisonPoints(frenchRows, []);

      expect(points).toHaveLength(2);
      expect(points[0]?.german).toBe(0);
      expect(points[1]?.german).toBe(0);
    });
  });

  describe('toStrategyComparisonPoints', () => {
    it('debe combinar la cuota de ambas estrategias por periodo', () => {
      const reduceTermRows = new FrenchAmortization().generate({
        principal: Money.of('10000', 'USD'),
        monthlyRate: new Decimal('0.01'),
        term: Term.ofMonths(3),
        startDate: START_DATE,
      });
      const reducePaymentRows = new FrenchAmortization().generate({
        principal: Money.of('8000', 'USD'),
        monthlyRate: new Decimal('0.01'),
        term: Term.ofMonths(3),
        startDate: START_DATE,
      });

      const points = toStrategyComparisonPoints(reduceTermRows, reducePaymentRows);

      expect(points).toHaveLength(3);
      expect(points[0]).toEqual({
        period: 1,
        reduceTerm: reduceTermRows[0]?.installment.toNumber(),
        reducePayment: reducePaymentRows[0]?.installment.toNumber(),
      });
    });

    it('debe rellenar con 0 cuando una estrategia termina antes que la otra', () => {
      const reduceTermRows = new FrenchAmortization().generate({
        principal: Money.of('1000', 'USD'),
        monthlyRate: new Decimal('0.01'),
        term: Term.ofMonths(2),
        startDate: START_DATE,
      });

      const points = toStrategyComparisonPoints(reduceTermRows, []);

      expect(points).toHaveLength(2);
      expect(points[0]?.reducePayment).toBe(0);
      expect(points[1]?.reducePayment).toBe(0);
    });
  });

  describe('formatCurrency', () => {
    it('debe formatear con 2 decimales', () => {
      expect(formatCurrency(1234.5)).toBe('1234.50');
    });

    it('debe redondear a 2 decimales cuando el valor tiene más precisión', () => {
      expect(formatCurrency(999.999)).toBe('1000.00');
    });

    it('debe formatear valores negativos', () => {
      expect(formatCurrency(-50)).toBe('-50.00');
    });

    it('debe formatear cero', () => {
      expect(formatCurrency(0)).toBe('0.00');
    });
  });
});
