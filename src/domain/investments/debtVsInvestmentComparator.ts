import type Decimal from 'decimal.js';
import { Money } from '../shared/money';
import { Term } from '../shared/term';
import type { InterestRate, MonthlyConversionMethod } from '../shared/interestRate';
import type { AmortizationSystem } from '../loans/amortizationSystem';
import { FrenchAmortization } from '../loans/frenchAmortization';
import { runAmortization } from '../loans/amortizationEngine';
import { simulateExtraPayments } from '../loans/extra-payments/extraPaymentSimulator';
import { ReduceTermStrategy } from '../loans/extra-payments/reduceTermStrategy';
import { calculateFutureValue } from './investmentCalculator';
import type { InvestmentInput } from './investmentCalculator';

export const INVESTMENT_DISCLAIMER =
  'El rendimiento de la inversión es una proyección basada en la tasa ingresada y NO está garantizado. ' +
  'El ahorro de intereses por abonar deuda es un beneficio cierto y contractual. Compare ambas opciones considerando su tolerancia al riesgo.';

export interface DebtVsInvestmentInput {
  readonly availableAmount: Money;
  readonly loanPrincipal: Money;
  readonly loanAnnualRate: InterestRate;
  readonly loanRateConversionMethod: MonthlyConversionMethod;
  readonly loanTermMonths: number;
  readonly loanStartDate: Date;
  readonly system?: AmortizationSystem;
  readonly investment: InvestmentInput;
}

export type DebtVsInvestmentRecommendation = 'pay-debt' | 'invest' | 'equivalent';

export interface DebtVsInvestmentResult {
  readonly guaranteedInterestSaved: Money;
  readonly expectedInvestmentGain: Money;
  readonly investmentRoi: Decimal | null;
  readonly breakEvenAnnualRate: Decimal;
  readonly recommendation: DebtVsInvestmentRecommendation;
  readonly disclaimer: string;
}

export function classifyRecommendation(
  guaranteedInterestSaved: Money,
  expectedInvestmentGain: Money,
): DebtVsInvestmentRecommendation {
  if (expectedInvestmentGain.equals(guaranteedInterestSaved)) {
    return 'equivalent';
  }
  return expectedInvestmentGain.greaterThan(guaranteedInterestSaved) ? 'invest' : 'pay-debt';
}

export function compareDebtVsInvestment(input: DebtVsInvestmentInput): DebtVsInvestmentResult {
  const {
    availableAmount,
    loanPrincipal,
    loanAnnualRate,
    loanRateConversionMethod,
    loanTermMonths,
    loanStartDate,
    investment,
  } = input;
  const system = input.system ?? new FrenchAmortization();
  const term = Term.ofMonths(loanTermMonths);

  const baseRequest = {
    system,
    principal: loanPrincipal,
    annualRate: loanAnnualRate,
    rateConversionMethod: loanRateConversionMethod,
    term,
    startDate: loanStartDate,
  };

  const baseline = runAmortization(baseRequest);
  const withPayoff = simulateExtraPayments({
    baseRequest,
    strategy: new ReduceTermStrategy(),
    extraPayments: [{ periodNumber: 1, amount: availableAmount }],
  });

  const guaranteedInterestSaved = baseline.summary.totalInterest
    .subtract(withPayoff.withExtraPayments.summary.totalInterest)
    .round();

  const investmentResult = calculateFutureValue(investment);
  const expectedInvestmentGain = investmentResult.futureValueNet
    .subtract(investmentResult.totalContributed)
    .round();

  const recommendation = classifyRecommendation(guaranteedInterestSaved, expectedInvestmentGain);

  return {
    guaranteedInterestSaved,
    expectedInvestmentGain,
    investmentRoi: investmentResult.roi,
    breakEvenAnnualRate: loanAnnualRate.annualValue(),
    recommendation,
    disclaimer: INVESTMENT_DISCLAIMER,
  };
}
