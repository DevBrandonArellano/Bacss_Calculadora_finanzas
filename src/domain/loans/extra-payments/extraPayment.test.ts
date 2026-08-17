import { describe, it, expect } from 'vitest';
import { validateExtraPayments } from './extraPayment';
import { Money } from '../../shared/money';
import { InvalidInputError, CurrencyMismatchError } from '../../shared/errors';

describe('validateExtraPayments', () => {
  it('no debe lanzar error cuando los abonos son válidos', () => {
    const payments = [
      { periodNumber: 3, amount: Money.of('2000', 'USD') },
      { periodNumber: 6, amount: Money.of('1000', 'USD') },
    ];
    expect(() => {
      validateExtraPayments(payments, 12, 'USD');
    }).not.toThrow();
  });

  it('no debe lanzar error cuando el array de abonos está vacío', () => {
    expect(() => {
      validateExtraPayments([], 12, 'USD');
    }).not.toThrow();
  });

  it('debe lanzar InvalidInputError cuando periodNumber no es entero', () => {
    const payments = [{ periodNumber: 3.5, amount: Money.of('100', 'USD') }];
    expect(() => {
      validateExtraPayments(payments, 12, 'USD');
    }).toThrow(InvalidInputError);
  });

  it('debe lanzar InvalidInputError cuando periodNumber es menor que 1', () => {
    const payments = [{ periodNumber: 0, amount: Money.of('100', 'USD') }];
    expect(() => {
      validateExtraPayments(payments, 12, 'USD');
    }).toThrow(InvalidInputError);
  });

  it('debe lanzar InvalidInputError cuando periodNumber excede el plazo total', () => {
    const payments = [{ periodNumber: 13, amount: Money.of('100', 'USD') }];
    expect(() => {
      validateExtraPayments(payments, 12, 'USD');
    }).toThrow(InvalidInputError);
  });

  it('debe lanzar InvalidInputError cuando hay periodNumber duplicados', () => {
    const payments = [
      { periodNumber: 3, amount: Money.of('100', 'USD') },
      { periodNumber: 3, amount: Money.of('200', 'USD') },
    ];
    expect(() => {
      validateExtraPayments(payments, 12, 'USD');
    }).toThrow(InvalidInputError);
  });

  it('debe lanzar InvalidInputError cuando el monto no es positivo', () => {
    const payments = [{ periodNumber: 3, amount: Money.zero('USD') }];
    expect(() => {
      validateExtraPayments(payments, 12, 'USD');
    }).toThrow(InvalidInputError);
  });

  it('debe lanzar CurrencyMismatchError cuando la moneda del abono difiere de la del préstamo', () => {
    const payments = [{ periodNumber: 3, amount: Money.of('100', 'EUR') }];
    expect(() => {
      validateExtraPayments(payments, 12, 'USD');
    }).toThrow(CurrencyMismatchError);
  });
});
