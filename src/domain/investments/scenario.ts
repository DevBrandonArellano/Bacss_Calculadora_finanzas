import type { AmortizationRequest } from '../loans/amortizationEngine';

export interface Scenario {
  readonly label: string;
  readonly request: AmortizationRequest;
}
