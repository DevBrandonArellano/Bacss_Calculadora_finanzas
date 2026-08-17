import Decimal from 'decimal.js';
import { InvalidInputError, CurrencyMismatchError } from './errors';
import type { Money } from './money';
import { Money as MoneyClass } from './money';

export function roundHalfEven(value: Decimal.Value, decimalPlaces = 2): Decimal {
  try {
    if (decimalPlaces < 0) {
      throw new InvalidInputError(
        `decimalPlaces must be non-negative, got ${String(decimalPlaces)}`,
        'decimalPlaces',
        decimalPlaces,
      );
    }

    const decimal = new Decimal(value);

    if (decimal.isNaN()) {
      throw new InvalidInputError('Value is NaN', 'value', value);
    }

    return decimal.toDecimalPlaces(decimalPlaces, Decimal.ROUND_HALF_EVEN);
  } catch (error) {
    if (error instanceof InvalidInputError) {
      throw error;
    }
    throw new InvalidInputError(`Failed to round value: ${String(error)}`, 'value', value);
  }
}

export function roundMoney(money: Money): Money {
  return money.round();
}

export function distributeAdjustment(values: readonly Money[], target: Money): Money[] {
  if (values.length === 0) {
    throw new InvalidInputError('Values array cannot be empty', 'values', values);
  }

  const currencyTarget = target.currency;
  for (const value of values) {
    if (value.currency !== currencyTarget) {
      throw new CurrencyMismatchError(
        `All values must have the same currency as target: ${currencyTarget}`,
        'currency',
        value.currency,
      );
    }
  }

  const sum = values.reduce((acc, v) => acc.add(v), MoneyClass.zero(currencyTarget));
  const diff = target.subtract(sum);

  const result = [...values];
  const lastIndex = values.length - 1;
  const last = result[lastIndex];

  if (last === undefined) {
    throw new InvalidInputError('Failed to access last element', 'values', values);
  }

  result[lastIndex] = last.add(diff);

  return result;
}

export const RoundingPolicy = { roundHalfEven, roundMoney, distributeAdjustment } as const;
