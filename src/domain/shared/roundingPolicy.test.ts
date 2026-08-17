import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';
import { roundHalfEven, roundMoney, distributeAdjustment, RoundingPolicy } from './roundingPolicy';
import { InvalidInputError, CurrencyMismatchError } from './errors';
import { Money } from './money';

function must<T>(value: T | undefined): T {
  if (value === undefined) {
    throw new Error('Unexpected undefined value in test');
  }
  return value;
}

describe('roundHalfEven', () => {
  // Equivalencia: sin empate
  it('debe redondear 1.004 a 1.00 cuando el tercer decimal es menor que 5', () => {
    const result = roundHalfEven(new Decimal('1.004'), 2);
    expect(result.toFixed(2)).toBe('1.00');
  });

  it('debe redondear 1.006 a 1.01 cuando el tercer decimal es mayor que 5', () => {
    const result = roundHalfEven(new Decimal('1.006'), 2);
    expect(result.toFixed(2)).toBe('1.01');
  });

  // Equivalencia + valores límite: empate exacto (half-to-even)
  it('debe redondear 1.005 a 1.00 cuando el empate cae hacia el dígito par inferior', () => {
    const result = roundHalfEven(new Decimal('1.005'), 2);
    expect(result.toFixed(2)).toBe('1.00');
  });

  it('debe redondear 1.015 a 1.02 cuando el empate cae hacia el dígito par superior', () => {
    const result = roundHalfEven(new Decimal('1.015'), 2);
    expect(result.toFixed(2)).toBe('1.02');
  });

  it('debe redondear 2.5 a 2 cuando se redondea a 0 decimales y el par más cercano es el inferior', () => {
    const result = roundHalfEven(new Decimal('2.5'), 0);
    expect(result.toFixed(0)).toBe('2');
  });

  // Valores límite: cero y signo
  it('debe redondear 0 a 0.00 cuando el valor es exactamente cero', () => {
    const result = roundHalfEven(new Decimal('0'), 2);
    expect(result.toFixed(2)).toBe('0.00');
  });

  it('debe redondear -1.005 a -1.00 cuando el valor es negativo y cae en un punto medio exacto', () => {
    const result = roundHalfEven(new Decimal('-1.005'), 2);
    expect(result.toFixed(2)).toBe('-1.00');
  });

  // Inválidos
  it('debe lanzar InvalidInputError cuando el valor es NaN', () => {
    const nan = new Decimal('NaN');
    expect(() => roundHalfEven(nan, 2)).toThrow(InvalidInputError);
  });

  it('debe lanzar InvalidInputError cuando el valor es un string no numérico', () => {
    expect(() => roundHalfEven('not a number', 2)).toThrow(InvalidInputError);
  });

  it('debe lanzar InvalidInputError cuando decimalPlaces es negativo', () => {
    expect(() => roundHalfEven(new Decimal('1.234'), -1)).toThrow(InvalidInputError);
  });

  // Arquitectura: sin efectos globales
  it('no debe alterar el resultado de una llamada posterior cuando se invoca repetidamente con distintos valores', () => {
    const first = roundHalfEven(new Decimal('1.005'), 2);
    const second = roundHalfEven(new Decimal('1.015'), 2);
    const third = roundHalfEven(new Decimal('1.005'), 2);
    expect(first.toFixed(2)).toBe('1.00');
    expect(second.toFixed(2)).toBe('1.02');
    expect(third.toFixed(2)).toBe('1.00');
  });
});

describe('roundMoney', () => {
  it('debe devolver un Money redondeado a 2 decimales conservando la misma moneda', () => {
    const m = Money.of('10.1234', 'USD');
    const rounded = roundMoney(m);
    expect(rounded.toFixed(2)).toBe('10.12');
    expect(rounded.currency).toBe('USD');
  });

  it('debe devolver un Money equivalente cuando ya tiene 2 decimales exactos (idempotencia)', () => {
    const m = Money.of('10.50', 'USD');
    const rounded = roundMoney(m);
    expect(rounded.toFixed(2)).toBe('10.50');
  });
});

describe('distributeAdjustment', () => {
  it('debe ajustar el último elemento cuando la suma de los valores no coincide con el total objetivo', () => {
    const m1 = Money.of('10.115', 'USD');
    const m2 = Money.of('20.225', 'USD');
    const target = Money.of('30.34', 'USD');
    const values = [m1, m2];

    const result = distributeAdjustment(values, target);

    expect(result.length).toBe(2);
    const sum = must(result[0]).add(must(result[1]));
    expect(sum.toFixed(2)).toBe(target.toFixed(2));
  });

  it('debe dejar los valores sin cambio de monto cuando la suma ya coincide exactamente con el total', () => {
    const m1 = Money.of('10.00', 'USD');
    const m2 = Money.of('20.00', 'USD');
    const target = Money.of('30.00', 'USD');
    const values = [m1, m2];

    const result = distributeAdjustment(values, target);

    expect(must(result[0]).toFixed(2)).toBe('10.00');
    expect(must(result[1]).toFixed(2)).toBe('20.00');
  });

  it('debe absorber un ajuste negativo en el último elemento cuando la suma excede el total objetivo', () => {
    const m1 = Money.of('15.00', 'USD');
    const m2 = Money.of('20.00', 'USD');
    const target = Money.of('30.00', 'USD');
    const values = [m1, m2];

    const result = distributeAdjustment(values, target);

    expect(must(result[0]).toFixed(2)).toBe('15.00');
    expect(must(result[1]).toFixed(2)).toBe('15.00');
  });

  it('debe aplicar todo el ajuste al único elemento cuando el array tiene longitud 1', () => {
    const m1 = Money.of('10.115', 'USD');
    const target = Money.of('10.50', 'USD');
    const values = [m1];

    const result = distributeAdjustment(values, target);

    expect(result.length).toBe(1);
    expect(must(result[0]).toFixed(2)).toBe('10.50');
  });

  it('debe lanzar InvalidInputError cuando el array de valores está vacío', () => {
    const target = Money.of('10.00', 'USD');
    expect(() => distributeAdjustment([], target)).toThrow(InvalidInputError);
  });

  it('debe lanzar CurrencyMismatchError cuando algún valor difiere en moneda respecto a los demás', () => {
    const m1 = Money.of('10.00', 'USD');
    const m2 = Money.of('20.00', 'EUR');
    const target = Money.of('30.00', 'USD');
    expect(() => distributeAdjustment([m1, m2], target)).toThrow(CurrencyMismatchError);
  });

  it('no debe mutar el array original de entrada', () => {
    const m1 = Money.of('10.00', 'USD');
    const m2 = Money.of('20.05', 'USD');
    const target = Money.of('30.10', 'USD');
    const values = [m1, m2];
    const original1 = m1.toFixed(2);
    const original2 = m2.toFixed(2);

    distributeAdjustment(values, target);

    expect(must(values[0]).toFixed(2)).toBe(original1);
    expect(must(values[1]).toFixed(2)).toBe(original2);
  });
});

describe('RoundingPolicy namespace', () => {
  it('debe exportar roundHalfEven como parte del namespace', () => {
    expect(RoundingPolicy.roundHalfEven).toBeDefined();
  });
});
