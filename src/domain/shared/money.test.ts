import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';
import { Money } from './money';
import { NegativeAmountError, InvalidInputError, CurrencyMismatchError } from './errors';

describe('Money.of / Money.ofNonNegative / Money.zero', () => {
  it('debe crear un Money válido cuando se recibe un monto positivo y una moneda', () => {
    const money = Money.of('100', 'USD');
    expect(money.toDecimal().toString()).toBe('100');
  });

  it('debe crear un Money con monto cero cuando se usa Money.zero(currency)', () => {
    const money = Money.zero('USD');
    expect(money.isZero()).toBe(true);
  });

  it('debe preservar precisión exacta cuando el monto tiene más de 2 decimales', () => {
    const money = Money.of('10.12345', 'USD');
    expect(money.toDecimal().toString()).toBe('10.12345');
  });

  it('debe permitir un monto negativo cuando se usa Money.of', () => {
    const money = Money.of('-50.00', 'USD');
    expect(money.isNegative()).toBe(true);
  });

  it('debe lanzar NegativeAmountError cuando se usa Money.ofNonNegative con un monto negativo', () => {
    expect(() => Money.ofNonNegative('-10', 'USD')).toThrow(NegativeAmountError);
  });

  it('debe aceptar 0 como válido cuando se usa Money.ofNonNegative(0, currency)', () => {
    const money = Money.ofNonNegative('0', 'USD');
    expect(money.isZero()).toBe(true);
  });

  it('debe lanzar InvalidInputError cuando el monto es NaN', () => {
    expect(() => Money.of(new Decimal('NaN'), 'USD')).toThrow(InvalidInputError);
  });

  it('debe lanzar InvalidInputError cuando el monto es Infinity', () => {
    expect(() => Money.of('Infinity', 'USD')).toThrow(InvalidInputError);
  });

  it('debe lanzar InvalidInputError cuando el monto es un string no numérico', () => {
    expect(() => Money.of('not a number', 'USD')).toThrow(InvalidInputError);
  });

  it('debe lanzar InvalidInputError cuando currency es un string vacío', () => {
    expect(() => Money.of('100', '')).toThrow(InvalidInputError);
  });

  it('debe aceptar montos extremadamente grandes', () => {
    const large = '999999999999999999.99';
    const money = Money.of(large, 'USD');
    expect(money.toDecimal().toString()).toBe(large);
  });
});

describe('Money — inmutabilidad', () => {
  it('no debe mutar la instancia original cuando se invoca add', () => {
    const original = Money.of('100', 'USD');
    const added = original.add(Money.of('50', 'USD'));
    expect(original.toDecimal().toString()).toBe('100');
    expect(added.toDecimal().toString()).toBe('150');
  });

  it('debe devolver una instancia distinta (no la misma referencia) cuando se invoca add', () => {
    const m1 = Money.of('100', 'USD');
    const m2 = Money.of('50', 'USD');
    const sum = m1.add(m2);
    expect(sum).not.toBe(m1);
    expect(sum).not.toBe(m2);
  });
});

describe('Money#add', () => {
  it('debe sumar dos Money de la misma moneda cuando ambos son positivos', () => {
    const m1 = Money.of('100.50', 'USD');
    const m2 = Money.of('50.25', 'USD');
    const sum = m1.add(m2);
    expect(sum.toDecimal().toString()).toBe('150.75');
  });

  it('debe sumar un Money positivo y uno negativo devolviendo el neto', () => {
    const m1 = Money.of('100', 'USD');
    const m2 = Money.of('-30', 'USD');
    const sum = m1.add(m2);
    expect(sum.toDecimal().toString()).toBe('70');
  });

  it('debe lanzar CurrencyMismatchError cuando se suman dos Money de distinta moneda', () => {
    const m1 = Money.of('100', 'USD');
    const m2 = Money.of('100', 'EUR');
    expect(() => m1.add(m2)).toThrow(CurrencyMismatchError);
  });
});

describe('Money#subtract', () => {
  it('debe restar dos Money de la misma moneda cuando el resultado es positivo', () => {
    const m1 = Money.of('100', 'USD');
    const m2 = Money.of('30', 'USD');
    const diff = m1.subtract(m2);
    expect(diff.toDecimal().toString()).toBe('70');
  });

  it('debe permitir un resultado negativo cuando se resta un monto mayor a uno menor', () => {
    const m1 = Money.of('30', 'USD');
    const m2 = Money.of('100', 'USD');
    const diff = m1.subtract(m2);
    expect(diff.isNegative()).toBe(true);
    expect(diff.toDecimal().toString()).toBe('-70');
  });

  it('debe lanzar CurrencyMismatchError cuando se restan dos Money de distinta moneda', () => {
    const m1 = Money.of('100', 'USD');
    const m2 = Money.of('50', 'EUR');
    expect(() => m1.subtract(m2)).toThrow(CurrencyMismatchError);
  });
});

describe('Money#multiply', () => {
  it('debe multiplicar el monto por un factor Decimal', () => {
    const m = Money.of('100', 'USD');
    const result = m.multiply(new Decimal('1.5'));
    expect(result.toDecimal().toString()).toBe('150');
  });

  it('debe multiplicar el monto por un factor number', () => {
    const m = Money.of('100', 'USD');
    const result = m.multiply(2);
    expect(result.toDecimal().toString()).toBe('200');
  });

  it('debe devolver Money cero cuando se multiplica por 0', () => {
    const m = Money.of('100', 'USD');
    const result = m.multiply(0);
    expect(result.isZero()).toBe(true);
  });

  it('debe devolver un monto negativo cuando se multiplica por un factor negativo', () => {
    const m = Money.of('100', 'USD');
    const result = m.multiply(-2);
    expect(result.isNegative()).toBe(true);
    expect(result.toDecimal().toString()).toBe('-200');
  });

  it('debe lanzar InvalidInputError cuando el factor no es un número válido', () => {
    const m = Money.of('100', 'USD');
    expect(() => m.multiply('not a number')).toThrow(InvalidInputError);
  });
});

describe('Money — comparación', () => {
  it('debe considerar iguales dos Money con el mismo monto y moneda', () => {
    const m1 = Money.of('100.50', 'USD');
    const m2 = Money.of('100.50', 'USD');
    expect(m1.equals(m2)).toBe(true);
  });

  it('debe considerar distintos dos Money con distinta moneda aunque el monto numérico sea igual', () => {
    const m1 = Money.of('100', 'USD');
    const m2 = Money.of('100', 'EUR');
    expect(m1.equals(m2)).toBe(false);
  });

  it('debe indicar greaterThan correctamente cuando el monto es mayor', () => {
    const m1 = Money.of('150', 'USD');
    const m2 = Money.of('100', 'USD');
    expect(m1.greaterThan(m2)).toBe(true);
    expect(m2.greaterThan(m1)).toBe(false);
  });

  it('debe indicar lessThan correctamente cuando el monto es menor', () => {
    const m1 = Money.of('50', 'USD');
    const m2 = Money.of('100', 'USD');
    expect(m1.lessThan(m2)).toBe(true);
    expect(m2.lessThan(m1)).toBe(false);
  });

  it('debe lanzar CurrencyMismatchError cuando se usa lessThan con distinta moneda', () => {
    const m1 = Money.of('100', 'USD');
    const m2 = Money.of('100', 'EUR');
    expect(() => m1.lessThan(m2)).toThrow(CurrencyMismatchError);
  });

  it('debe indicar greaterThanOrEqual correctamente cuando los montos son iguales', () => {
    const m1 = Money.of('100', 'USD');
    const m2 = Money.of('100', 'USD');
    expect(m1.greaterThanOrEqual(m2)).toBe(true);
  });

  it('debe lanzar CurrencyMismatchError cuando se usa greaterThanOrEqual con distinta moneda', () => {
    const m1 = Money.of('100', 'USD');
    const m2 = Money.of('100', 'EUR');
    expect(() => m1.greaterThanOrEqual(m2)).toThrow(CurrencyMismatchError);
  });

  it('debe indicar lessThanOrEqual correctamente cuando los montos son iguales', () => {
    const m1 = Money.of('100', 'USD');
    const m2 = Money.of('100', 'USD');
    expect(m1.lessThanOrEqual(m2)).toBe(true);
  });

  it('debe lanzar CurrencyMismatchError cuando se usa lessThanOrEqual con distinta moneda', () => {
    const m1 = Money.of('100', 'USD');
    const m2 = Money.of('100', 'EUR');
    expect(() => m1.lessThanOrEqual(m2)).toThrow(CurrencyMismatchError);
  });

  it('debe indicar isZero true cuando el monto es exactamente 0', () => {
    const m = Money.zero('USD');
    expect(m.isZero()).toBe(true);
  });

  it('debe indicar isNegative true cuando el monto es menor que 0', () => {
    const m = Money.of('-50', 'USD');
    expect(m.isNegative()).toBe(true);
  });

  it('debe indicar isPositive true cuando el monto es mayor que 0', () => {
    const m = Money.of('50', 'USD');
    expect(m.isPositive()).toBe(true);
  });

  it('debe indicar isPositive false cuando el monto es exactamente 0', () => {
    const m = Money.zero('USD');
    expect(m.isPositive()).toBe(false);
  });

  it('debe lanzar CurrencyMismatchError cuando se comparan dos Money de distinta moneda', () => {
    const m1 = Money.of('100', 'USD');
    const m2 = Money.of('100', 'EUR');
    expect(() => m1.greaterThan(m2)).toThrow(CurrencyMismatchError);
  });
});

describe('Money#round', () => {
  it('debe redondear a 2 decimales con half-to-even cuando el monto tiene más decimales', () => {
    const m = Money.of('10.1234', 'USD');
    const rounded = m.round();
    expect(rounded.toFixed(2)).toBe('10.12');
  });

  it('debe devolver un Money equivalente cuando el monto ya tiene exactamente 2 decimales', () => {
    const m = Money.of('10.50', 'USD');
    const rounded = m.round();
    expect(rounded.toFixed(2)).toBe('10.50');
  });
});

describe('Money — salida', () => {
  it('debe formatear toString con exactamente 2 decimales', () => {
    const m = Money.of('100.5', 'USD');
    expect(m.toString()).toBe('100.50');
  });

  it('debe exponer toDecimal devolviendo un Decimal equivalente al monto interno', () => {
    const m = Money.of('100.50', 'USD');
    const dec = m.toDecimal();
    expect(dec).toBeInstanceOf(Decimal);
    expect(dec.toFixed(2)).toBe('100.50');
  });

  it('debe exponer toNumber devolviendo el valor numérico equivalente (lossy, solo para UI)', () => {
    const m = Money.of('100.50', 'USD');
    expect(m.toNumber()).toBe(100.5);
  });
});
