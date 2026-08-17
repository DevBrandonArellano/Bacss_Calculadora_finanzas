import type { Money } from '../shared/money';

export interface AmortizationRow {
  readonly periodNumber: number;
  readonly date: Date;
  readonly installment: Money;
  readonly interest: Money;
  readonly principalPaid: Money;
  readonly remainingBalance: Money;
}
