import type { Money } from '../../shared/money';
import { InvalidInputError, CurrencyMismatchError } from '../../shared/errors';

export interface ExtraPayment {
  readonly periodNumber: number;
  readonly amount: Money;
}

export function validateExtraPayments(
  payments: readonly ExtraPayment[],
  totalPeriods: number,
  currency: string,
): void {
  const seenPeriods = new Set<number>();

  for (const payment of payments) {
    if (!Number.isInteger(payment.periodNumber)) {
      throw new InvalidInputError(
        'Extra payment periodNumber must be an integer',
        'periodNumber',
        payment.periodNumber,
      );
    }
    if (payment.periodNumber < 1 || payment.periodNumber > totalPeriods) {
      throw new InvalidInputError(
        `Extra payment periodNumber must be between 1 and ${String(totalPeriods)}`,
        'periodNumber',
        payment.periodNumber,
      );
    }
    if (seenPeriods.has(payment.periodNumber)) {
      throw new InvalidInputError(
        'Duplicate periodNumber in extra payments',
        'periodNumber',
        payment.periodNumber,
      );
    }
    seenPeriods.add(payment.periodNumber);

    if (!payment.amount.isPositive()) {
      throw new InvalidInputError(
        'Extra payment amount must be positive',
        'amount',
        payment.amount.toString(),
      );
    }
    if (payment.amount.currency !== currency) {
      throw new CurrencyMismatchError(
        `Extra payment currency (${payment.amount.currency}) must match loan currency (${currency})`,
        'currency',
        payment.amount.currency,
      );
    }
  }
}
