import { describe, it, expect } from 'vitest';
import {
  DomainError,
  InvalidInputError,
  NegativeAmountError,
  OutOfRangeError,
  CurrencyMismatchError,
} from './errors';

describe('DomainError (base class)', () => {
  it('debe asignar name igual al nombre de la subclase concreta cuando se lanza InvalidInputError', () => {
    const error = new InvalidInputError('test message', 'test_field', 123);
    expect(error.name).toBe('InvalidInputError');
  });

  it('debe ser instanceof Error y de DomainError cuando se lanza InvalidInputError', () => {
    const error = new InvalidInputError('test message', 'test_field', 123);
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(DomainError);
    expect(error).toBeInstanceOf(InvalidInputError);
  });

  it('debe incluir code, field y receivedValue cuando se proveen en el constructor', () => {
    const error = new InvalidInputError('test message', 'amount_field', 999);
    expect(error.code).toBe('INVALID_INPUT');
    expect(error.field).toBe('amount_field');
    expect(error.receivedValue).toBe(999);
  });

  it('debe omitir field y receivedValue cuando no se proveen en el constructor', () => {
    const error = new InvalidInputError('test message');
    expect(error.code).toBe('INVALID_INPUT');
    expect(error.field).toBeUndefined();
    expect(error.receivedValue).toBeUndefined();
  });
});

describe('InvalidInputError', () => {
  it('debe crearse con code INVALID_INPUT y ser instanceof DomainError', () => {
    const error = new InvalidInputError('Invalid value');
    expect(error.code).toBe('INVALID_INPUT');
    expect(error).toBeInstanceOf(DomainError);
  });
});

describe('NegativeAmountError', () => {
  it('debe crearse con code NEGATIVE_AMOUNT y ser instanceof DomainError', () => {
    const error = new NegativeAmountError('Amount cannot be negative');
    expect(error.code).toBe('NEGATIVE_AMOUNT');
    expect(error).toBeInstanceOf(DomainError);
  });
});

describe('OutOfRangeError', () => {
  it('debe crearse con code OUT_OF_RANGE y ser instanceof DomainError', () => {
    const error = new OutOfRangeError('Value out of range');
    expect(error.code).toBe('OUT_OF_RANGE');
    expect(error).toBeInstanceOf(DomainError);
  });
});

describe('CurrencyMismatchError', () => {
  it('debe crearse con code CURRENCY_MISMATCH y ser instanceof DomainError', () => {
    const error = new CurrencyMismatchError('Currency mismatch');
    expect(error.code).toBe('CURRENCY_MISMATCH');
    expect(error).toBeInstanceOf(DomainError);
  });
});
