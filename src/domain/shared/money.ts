import Decimal from 'decimal.js';
import { InvalidInputError, NegativeAmountError, CurrencyMismatchError } from './errors';
import { roundHalfEven } from './roundingPolicy';

export class Money {
  private readonly amount: Decimal;
  private readonly currencyCode: string;

  private constructor(amount: Decimal, currency: string) {
    this.amount = amount;
    this.currencyCode = currency;
  }

  static of(amount: Decimal.Value, currency = 'USD'): Money {
    try {
      if (!currency || typeof currency !== 'string') {
        throw new InvalidInputError('Currency must be a non-empty string', 'currency', currency);
      }

      const decimal = new Decimal(amount);

      if (decimal.isNaN() || !decimal.isFinite()) {
        throw new InvalidInputError(
          `Amount must be a valid number, got ${String(amount)}`,
          'amount',
          amount,
        );
      }

      return new Money(decimal, currency);
    } catch (error) {
      if (error instanceof InvalidInputError) {
        throw error;
      }
      throw new InvalidInputError(`Failed to create Money: ${String(error)}`, 'amount', amount);
    }
  }

  static ofNonNegative(amount: Decimal.Value, currency = 'USD'): Money {
    const money = Money.of(amount, currency);
    if (money.isNegative()) {
      throw new NegativeAmountError('Amount must be non-negative', 'amount', amount);
    }
    return money;
  }

  static zero(currency = 'USD'): Money {
    return Money.of('0', currency);
  }

  add(other: Money): Money {
    if (this.currencyCode !== other.currencyCode) {
      throw new CurrencyMismatchError(
        `Cannot add Money with different currencies: ${this.currencyCode} vs ${other.currencyCode}`,
        'currency',
        other.currencyCode,
      );
    }
    return new Money(this.amount.plus(other.amount), this.currencyCode);
  }

  subtract(other: Money): Money {
    if (this.currencyCode !== other.currencyCode) {
      throw new CurrencyMismatchError(
        `Cannot subtract Money with different currencies: ${this.currencyCode} vs ${other.currencyCode}`,
        'currency',
        other.currencyCode,
      );
    }
    return new Money(this.amount.minus(other.amount), this.currencyCode);
  }

  multiply(factor: Decimal.Value): Money {
    try {
      const factorDecimal = new Decimal(factor);
      return new Money(this.amount.times(factorDecimal), this.currencyCode);
    } catch (error) {
      throw new InvalidInputError(`Failed to multiply Money: ${String(error)}`, 'factor', factor);
    }
  }

  equals(other: Money): boolean {
    return this.currencyCode === other.currencyCode && this.amount.equals(other.amount);
  }

  greaterThan(other: Money): boolean {
    if (this.currencyCode !== other.currencyCode) {
      throw new CurrencyMismatchError(
        `Cannot compare Money with different currencies: ${this.currencyCode} vs ${other.currencyCode}`,
        'currency',
        other.currencyCode,
      );
    }
    return this.amount.greaterThan(other.amount);
  }

  greaterThanOrEqual(other: Money): boolean {
    if (this.currencyCode !== other.currencyCode) {
      throw new CurrencyMismatchError(
        `Cannot compare Money with different currencies: ${this.currencyCode} vs ${other.currencyCode}`,
        'currency',
        other.currencyCode,
      );
    }
    return this.amount.greaterThanOrEqualTo(other.amount);
  }

  lessThan(other: Money): boolean {
    if (this.currencyCode !== other.currencyCode) {
      throw new CurrencyMismatchError(
        `Cannot compare Money with different currencies: ${this.currencyCode} vs ${other.currencyCode}`,
        'currency',
        other.currencyCode,
      );
    }
    return this.amount.lessThan(other.amount);
  }

  lessThanOrEqual(other: Money): boolean {
    if (this.currencyCode !== other.currencyCode) {
      throw new CurrencyMismatchError(
        `Cannot compare Money with different currencies: ${this.currencyCode} vs ${other.currencyCode}`,
        'currency',
        other.currencyCode,
      );
    }
    return this.amount.lessThanOrEqualTo(other.amount);
  }

  isZero(): boolean {
    return this.amount.isZero();
  }

  isNegative(): boolean {
    return this.amount.isNegative();
  }

  isPositive(): boolean {
    // decimal.js treats 0 as having a positive sign, so Decimal#isPositive()
    // returns true for zero. Money#isPositive() must exclude zero explicitly.
    return this.amount.isPositive() && !this.amount.isZero();
  }

  round(): Money {
    return new Money(roundHalfEven(this.amount, 2), this.currencyCode);
  }

  toDecimal(): Decimal {
    return this.amount;
  }

  toNumber(): number {
    return this.amount.toNumber();
  }

  toString(): string {
    return this.amount.toFixed(2);
  }

  toFixed(decimalPlaces: number): string {
    return this.amount.toFixed(decimalPlaces);
  }

  get currency(): string {
    return this.currencyCode;
  }
}
