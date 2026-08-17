import type Decimal from 'decimal.js';
import type { Money } from '../shared/money';
import type { Term } from '../shared/term';
import type { AmortizationRow } from './amortizationRow';

export interface AmortizationInput {
  readonly principal: Money;
  readonly monthlyRate: Decimal;
  readonly term: Term;
  readonly startDate: Date;
}

export interface AmortizationSystem {
  generate(input: AmortizationInput): readonly AmortizationRow[];
}
