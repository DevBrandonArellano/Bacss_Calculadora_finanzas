import { DomainError } from '../../domain/shared/errors';
import { runAmortization } from '../../domain/loans/amortizationEngine';
import type {
  AmortizationRequest,
  AmortizationResult,
} from '../../domain/loans/amortizationEngine';
import type { Logger } from '../ports/logger';

export function calculateSchedule(
  request: AmortizationRequest,
  logger: Logger,
): AmortizationResult {
  try {
    return runAmortization(request);
  } catch (error) {
    if (error instanceof DomainError) {
      logger.log({
        severity: 'error',
        message: `calculateSchedule failed: ${error.message}`,
        context: { code: error.code, field: error.field },
      });
    }
    throw error;
  }
}
