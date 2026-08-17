import Decimal from 'decimal.js';
import { Money } from '../shared/money';
import type { InterestRate, MonthlyConversionMethod } from '../shared/interestRate';

export interface InvestmentInput {
  readonly initialAmount: Money;
  readonly monthlyContribution: Money;
  readonly annualReturnRate: InterestRate;
  readonly rateConversionMethod: MonthlyConversionMethod;
  readonly months: number;
  readonly taxRate?: Decimal;
  readonly feeRate?: Decimal;
}

export interface InvestmentResult {
  readonly futureValueGross: Money;
  readonly totalContributed: Money;
  readonly futureValueNet: Money;
  readonly roi: Decimal | null;
}

export function calculateFutureValue(input: InvestmentInput): InvestmentResult {
  const { initialAmount, monthlyContribution, annualReturnRate, rateConversionMethod, months } =
    input;
  const currency = initialAmount.currency;
  const r = annualReturnRate.toMonthly(rateConversionMethod);

  const onePlusR = r.plus(1);
  const growthFactor = onePlusR.pow(months);

  const fvInitial = initialAmount.multiply(growthFactor);

  const fvContributionsDecimal = r.isZero()
    ? monthlyContribution.toDecimal().times(months)
    : monthlyContribution.toDecimal().times(growthFactor.minus(1).dividedBy(r));
  const fvContributions = Money.of(fvContributionsDecimal, currency);

  const futureValueGross = fvInitial.add(fvContributions).round();
  const totalContributed = initialAmount.add(monthlyContribution.multiply(months)).round();

  const feeRate = input.feeRate ?? new Decimal(0);
  const netAfterFee = futureValueGross.multiply(new Decimal(1).minus(feeRate)).round();

  const taxRate = input.taxRate ?? new Decimal(0);
  const gain = netAfterFee.subtract(totalContributed);
  const tax = gain.isPositive() ? gain.multiply(taxRate).round() : Money.zero(currency);

  const futureValueNet = netAfterFee.subtract(tax);

  const roi = totalContributed.isZero()
    ? null
    : futureValueNet.subtract(totalContributed).toDecimal().dividedBy(totalContributed.toDecimal());

  return { futureValueGross, totalContributed, futureValueNet, roi };
}
