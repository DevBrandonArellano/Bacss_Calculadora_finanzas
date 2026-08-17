import Decimal from 'decimal.js';
import { InvalidInputError, OutOfRangeError } from './errors';

export class Term {
  static readonly MAX_MONTHS = 600;

  private readonly months: number;

  private constructor(months: number) {
    this.months = months;
  }

  static ofMonths(value: number): Term {
    if (!Number.isInteger(value)) {
      throw new InvalidInputError('Term in months must be an integer', 'months', value);
    }
    if (value < 1) {
      throw new InvalidInputError('Term in months must be at least 1', 'months', value);
    }
    if (value > Term.MAX_MONTHS) {
      throw new OutOfRangeError(
        `Term exceeds MAX_MONTHS (${String(Term.MAX_MONTHS)})`,
        'months',
        value,
      );
    }
    return new Term(value);
  }

  static ofYears(value: Decimal.Value): Term {
    let monthsDecimal: Decimal;
    try {
      monthsDecimal = new Decimal(value).times(12);
    } catch (error) {
      throw new InvalidInputError(`Failed to parse years: ${String(error)}`, 'years', value);
    }

    if (!monthsDecimal.isInteger()) {
      throw new InvalidInputError(
        'Years must normalize to an exact integer number of months',
        'years',
        value,
      );
    }

    return Term.ofMonths(monthsDecimal.toNumber());
  }

  toMonths(): number {
    return this.months;
  }

  toYears(): number {
    return this.months / 12;
  }
}
