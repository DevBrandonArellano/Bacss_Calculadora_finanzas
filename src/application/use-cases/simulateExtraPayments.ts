import { DomainError } from '../../domain/shared/errors';
import { simulateExtraPayments as simulateExtraPaymentsDomain } from '../../domain/loans/extra-payments/extraPaymentSimulator';
import type {
  ExtraPaymentRequest,
  ExtraPaymentComparison,
} from '../../domain/loans/extra-payments/extraPaymentSimulator';
import type { Logger } from '../ports/logger';

export function simulateExtraPayments(
  request: ExtraPaymentRequest,
  logger: Logger,
): ExtraPaymentComparison {
  try {
    return simulateExtraPaymentsDomain(request);
  } catch (error) {
    if (error instanceof DomainError) {
      logger.log({
        severity: 'error',
        message: `simulateExtraPayments failed: ${error.message}`,
        context: { code: error.code, field: error.field },
      });
    }
    throw error;
  }
}
