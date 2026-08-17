import Decimal from 'decimal.js';
import { InvalidInputError, NegativeAmountError, OutOfRangeError } from './errors';

export type MonthlyConversionMethod = 'nominal' | 'effective';

export class InterestRate {
  static readonly MAX_ANNUAL_RATE = new Decimal('1');

  private readonly annualFraction: Decimal;

  private constructor(annualFraction: Decimal) {
    this.annualFraction = annualFraction;
  }

  static fromPercentage(value: Decimal.Value): InterestRate {
    const fraction = InterestRate.toDecimalSafe(value, 'value').dividedBy(100);
    return InterestRate.create(fraction, value);
  }

  static fromDecimalFraction(value: Decimal.Value): InterestRate {
    const fraction = InterestRate.toDecimalSafe(value, 'value');
    return InterestRate.create(fraction, value);
  }

  private static toDecimalSafe(value: Decimal.Value, field: string): Decimal {
    try {
      const decimal = new Decimal(value);
      if (decimal.isNaN() || !decimal.isFinite()) {
        throw new InvalidInputError(
          `Rate must be a valid finite number, got ${String(value)}`,
          field,
          value,
        );
      }
      return decimal;
    } catch (error) {
      if (error instanceof InvalidInputError) {
        throw error;
      }
      throw new InvalidInputError(`Failed to parse rate: ${String(error)}`, field, value);
    }
  }

  private static create(fraction: Decimal, originalValue: Decimal.Value): InterestRate {
    if (fraction.isNegative()) {
      throw new NegativeAmountError('Interest rate cannot be negative', 'value', originalValue);
    }
    if (fraction.greaterThan(InterestRate.MAX_ANNUAL_RATE)) {
      throw new OutOfRangeError(
        `Interest rate exceeds MAX_ANNUAL_RATE (${InterestRate.MAX_ANNUAL_RATE.toString()})`,
        'value',
        originalValue,
      );
    }
    return new InterestRate(fraction);
  }

  annualValue(): Decimal {
    return this.annualFraction;
  }

  annualPercentage(): Decimal {
    return this.annualFraction.times(100);
  }

  toMonthlyNominal(): Decimal {
    return this.annualFraction.dividedBy(12);
  }

  toMonthlyEffective(): Decimal {
    if (this.annualFraction.isZero()) {
      return new Decimal(0);
    }
    const base = new Decimal(1).plus(this.annualFraction);
    return base.pow(new Decimal(1).dividedBy(12)).minus(1);
  }

  toMonthly(method: MonthlyConversionMethod): Decimal {
    return method === 'nominal' ? this.toMonthlyNominal() : this.toMonthlyEffective();
  }
}
