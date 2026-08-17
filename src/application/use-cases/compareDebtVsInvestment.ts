import { DomainError } from '../../domain/shared/errors';
import { compareDebtVsInvestment as compareDebtVsInvestmentDomain } from '../../domain/investments/debtVsInvestmentComparator';
import type {
  DebtVsInvestmentInput,
  DebtVsInvestmentResult,
} from '../../domain/investments/debtVsInvestmentComparator';
import type { Logger } from '../ports/logger';

export function compareDebtVsInvestment(
  input: DebtVsInvestmentInput,
  logger: Logger,
): DebtVsInvestmentResult {
  try {
    return compareDebtVsInvestmentDomain(input);
  } catch (error) {
    if (error instanceof DomainError) {
      logger.log({
        severity: 'error',
        message: `compareDebtVsInvestment failed: ${error.message}`,
        context: { code: error.code, field: error.field },
      });
    }
    throw error;
  }
}
