import type { ExtraPaymentStrategy, NextSegmentParams } from './extraPaymentStrategy';

/**
 * Mantiene el plazo restante fijo; AmortizationSystem.generate recalcula
 * automáticamente la cuota/capital sobre el saldo menor (sin rama por sistema).
 */
export class ReducePaymentStrategy implements ExtraPaymentStrategy {
  readonly name = 'reduce-payment' as const;

  computeNextTermMonths(params: NextSegmentParams): number {
    return params.remainingOriginalPeriods;
  }
}
