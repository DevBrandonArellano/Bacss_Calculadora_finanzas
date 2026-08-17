import type Decimal from 'decimal.js';
import type { Money } from '../../shared/money';
import type { AmortizationSystem } from '../amortizationSystem';

export interface NextSegmentParams {
  readonly system: AmortizationSystem;
  readonly newPrincipal: Money;
  readonly monthlyRate: Decimal;
  readonly referenceInstallment: Money;
  readonly remainingOriginalPeriods: number;
}

export interface ExtraPaymentStrategy {
  readonly name: 'reduce-term' | 'reduce-payment';
  computeNextTermMonths(params: NextSegmentParams): number;
}
