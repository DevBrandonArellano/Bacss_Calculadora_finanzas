import type { Money } from '../../shared/money';
import type { AmortizationRow } from '../amortizationRow';

export interface AdvancedAmortizationRow extends AmortizationRow {
  readonly extraPayment: Money;
  readonly totalPrincipalPaid: Money;
}
