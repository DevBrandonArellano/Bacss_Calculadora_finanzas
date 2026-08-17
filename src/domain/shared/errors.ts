export abstract class DomainError extends Error {
  readonly code: string;
  readonly field?: string;
  readonly receivedValue?: unknown;

  protected constructor(message: string, code: string, field?: string, receivedValue?: unknown) {
    super(message);
    this.name = new.target.name;
    this.code = code;
    this.field = field;
    this.receivedValue = receivedValue;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class InvalidInputError extends DomainError {
  constructor(message: string, field?: string, receivedValue?: unknown) {
    super(message, 'INVALID_INPUT', field, receivedValue);
  }
}

export class NegativeAmountError extends DomainError {
  constructor(message: string, field?: string, receivedValue?: unknown) {
    super(message, 'NEGATIVE_AMOUNT', field, receivedValue);
  }
}

export class OutOfRangeError extends DomainError {
  constructor(message: string, field?: string, receivedValue?: unknown) {
    super(message, 'OUT_OF_RANGE', field, receivedValue);
  }
}

export class CurrencyMismatchError extends DomainError {
  constructor(message: string, field?: string, receivedValue?: unknown) {
    super(message, 'CURRENCY_MISMATCH', field, receivedValue);
  }
}
