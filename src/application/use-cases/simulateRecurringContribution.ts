import { DomainError } from '../../domain/shared/errors';
import { simulateExtraPayments as simulateExtraPaymentsDomain } from '../../domain/loans/extra-payments/extraPaymentSimulator';
import type {
  ExtraPaymentRequest,
  ExtraPaymentComparison,
} from '../../domain/loans/extra-payments/extraPaymentSimulator';
import type { Logger } from '../ports/logger';

/**
 * Caso de uso dedicado para aportes recurrentes (Fase 5). Delega en el mismo
 * simulador de dominio que los abonos únicos — un aporte recurrente ya se
 * modela como una serie de ExtraPayment fusionados, sin lógica adicional.
 */
export function simulateRecurringContribution(
  request: ExtraPaymentRequest,
  logger: Logger,
): ExtraPaymentComparison {
  try {
    return simulateExtraPaymentsDomain(request);
  } catch (error) {
    if (error instanceof DomainError) {
      logger.log({
        severity: 'error',
        message: `simulateRecurringContribution failed: ${error.message}`,
        context: { code: error.code, field: error.field },
      });
    }
    throw error;
  }
}
