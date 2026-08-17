import { InvalidInputError } from '../../shared/errors';
import type { Money } from '../../shared/money';
import type { ExtraPayment } from './extraPayment';

export interface RecurringContribution {
  readonly amount: Money;
  readonly startPeriod: number;
  readonly endPeriod: number;
}

export function expandRecurringContribution(contribution: RecurringContribution): ExtraPayment[] {
  const { amount, startPeriod, endPeriod } = contribution;

  if (!Number.isInteger(startPeriod) || !Number.isInteger(endPeriod)) {
    throw new InvalidInputError(
      'RecurringContribution startPeriod and endPeriod must be integers',
      'startPeriod',
      startPeriod,
    );
  }
  if (startPeriod < 1 || endPeriod < startPeriod) {
    throw new InvalidInputError(
      'RecurringContribution must have startPeriod >= 1 and endPeriod >= startPeriod',
      'startPeriod',
      startPeriod,
    );
  }

  const payments: ExtraPayment[] = [];
  for (let periodNumber = startPeriod; periodNumber <= endPeriod; periodNumber++) {
    payments.push({ periodNumber, amount });
  }
  return payments;
}
