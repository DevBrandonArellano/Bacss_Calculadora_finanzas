import { DomainError } from '../../domain/shared/errors';
import { compareScenarios as compareScenariosDomain } from '../../domain/investments/scenarioComparator';
import type { ScenarioComparisonResult } from '../../domain/investments/scenarioComparator';
import type { Scenario } from '../../domain/investments/scenario';
import type { Logger } from '../ports/logger';

export function compareScenarios(
  scenarios: readonly Scenario[],
  logger: Logger,
): ScenarioComparisonResult {
  try {
    return compareScenariosDomain(scenarios);
  } catch (error) {
    if (error instanceof DomainError) {
      logger.log({
        severity: 'error',
        message: `compareScenarios failed: ${error.message}`,
        context: { code: error.code, field: error.field },
      });
    }
    throw error;
  }
}
