import { describe, it, expect } from 'vitest';
import {
  compareDebtVsInvestment,
  classifyRecommendation,
  INVESTMENT_DISCLAIMER,
} from './debtVsInvestmentComparator';
import { Money } from '../shared/money';
import { InterestRate } from '../shared/interestRate';

const START_DATE = new Date('2026-01-15T00:00:00.000Z');

describe('classifyRecommendation', () => {
  it('debe devolver "equivalent" cuando el ahorro garantizado y la ganancia esperada son exactamente iguales (punto de equilibrio)', () => {
    const saved = Money.of('100', 'USD');
    const gain = Money.of('100', 'USD');
    expect(classifyRecommendation(saved, gain)).toBe('equivalent');
  });

  it('debe devolver "pay-debt" cuando el ahorro garantizado es mayor que la ganancia esperada', () => {
    const saved = Money.of('434.67', 'USD');
    const gain = Money.of('415.00', 'USD');
    expect(classifyRecommendation(saved, gain)).toBe('pay-debt');
  });

  it('debe devolver "invest" cuando la ganancia esperada es mayor que el ahorro garantizado', () => {
    const saved = Money.of('100', 'USD');
    const gain = Money.of('500', 'USD');
    expect(classifyRecommendation(saved, gain)).toBe('invest');
  });
});

describe('compareDebtVsInvestment — Caso 14', () => {
  it('debe recomendar pagar deuda cuando el ahorro garantizado supera la ganancia esperada (verificado independientemente)', () => {
    const result = compareDebtVsInvestment({
      availableAmount: Money.of('5000', 'USD'),
      loanPrincipal: Money.of('10000', 'USD'),
      loanAnnualRate: InterestRate.fromPercentage('12'),
      loanRateConversionMethod: 'nominal',
      loanTermMonths: 12,
      loanStartDate: START_DATE,
      investment: {
        initialAmount: Money.of('5000', 'USD'),
        monthlyContribution: Money.zero('USD'),
        annualReturnRate: InterestRate.fromPercentage('8'),
        rateConversionMethod: 'nominal',
        months: 12,
      },
    });

    expect(result.guaranteedInterestSaved.toFixed(2)).toBe('434.67');
    expect(result.expectedInvestmentGain.toFixed(2)).toBe('415.00');
    expect(result.recommendation).toBe('pay-debt');
  });

  it('debe incluir siempre el disclaimer de rendimiento no garantizado', () => {
    const result = compareDebtVsInvestment({
      availableAmount: Money.of('5000', 'USD'),
      loanPrincipal: Money.of('10000', 'USD'),
      loanAnnualRate: InterestRate.fromPercentage('12'),
      loanRateConversionMethod: 'nominal',
      loanTermMonths: 12,
      loanStartDate: START_DATE,
      investment: {
        initialAmount: Money.of('5000', 'USD'),
        monthlyContribution: Money.zero('USD'),
        annualReturnRate: InterestRate.fromPercentage('20'),
        rateConversionMethod: 'nominal',
        months: 12,
      },
    });

    expect(result.disclaimer).toBe(INVESTMENT_DISCLAIMER);
    expect(result.disclaimer.length).toBeGreaterThan(0);
  });

  it('debe recomendar invertir cuando el rendimiento esperado es muy superior a la tasa del préstamo', () => {
    const result = compareDebtVsInvestment({
      availableAmount: Money.of('5000', 'USD'),
      loanPrincipal: Money.of('10000', 'USD'),
      loanAnnualRate: InterestRate.fromPercentage('12'),
      loanRateConversionMethod: 'nominal',
      loanTermMonths: 12,
      loanStartDate: START_DATE,
      investment: {
        initialAmount: Money.of('5000', 'USD'),
        monthlyContribution: Money.zero('USD'),
        annualReturnRate: InterestRate.fromPercentage('60'),
        rateConversionMethod: 'nominal',
        months: 12,
      },
    });

    expect(result.recommendation).toBe('invest');
    expect(result.expectedInvestmentGain.greaterThan(result.guaranteedInterestSaved)).toBe(true);
  });

  it('investmentRoi debe exponer el ROI simple de la inversión (verificado independientemente)', () => {
    const result = compareDebtVsInvestment({
      availableAmount: Money.of('5000', 'USD'),
      loanPrincipal: Money.of('10000', 'USD'),
      loanAnnualRate: InterestRate.fromPercentage('12'),
      loanRateConversionMethod: 'nominal',
      loanTermMonths: 12,
      loanStartDate: START_DATE,
      investment: {
        initialAmount: Money.of('5000', 'USD'),
        monthlyContribution: Money.zero('USD'),
        annualReturnRate: InterestRate.fromPercentage('8'),
        rateConversionMethod: 'nominal',
        months: 12,
      },
    });

    // totalContributed = 5000 (sin aportes), expectedInvestmentGain = 415.00 => ROI = 415/5000 = 0.083
    expect(result.investmentRoi?.toFixed(4)).toBe('0.0830');
  });

  it('breakEvenAnnualRate debe exponer la tasa anual del préstamo', () => {
    const result = compareDebtVsInvestment({
      availableAmount: Money.of('5000', 'USD'),
      loanPrincipal: Money.of('10000', 'USD'),
      loanAnnualRate: InterestRate.fromPercentage('12'),
      loanRateConversionMethod: 'nominal',
      loanTermMonths: 12,
      loanStartDate: START_DATE,
      investment: {
        initialAmount: Money.of('5000', 'USD'),
        monthlyContribution: Money.zero('USD'),
        annualReturnRate: InterestRate.fromPercentage('8'),
        rateConversionMethod: 'nominal',
        months: 12,
      },
    });

    expect(result.breakEvenAnnualRate.toString()).toBe('0.12');
  });
});
