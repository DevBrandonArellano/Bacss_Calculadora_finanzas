import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';
import { InterestRate } from './interestRate';
import { NegativeAmountError, InvalidInputError, OutOfRangeError } from './errors';

describe('InterestRate.fromPercentage / fromDecimalFraction', () => {
  it('debe crear una tasa válida cuando se usa fromPercentage(12) equivalente a 0.12 en fracción', () => {
    const rate = InterestRate.fromPercentage(12);
    expect(rate.annualValue().toString()).toBe('0.12');
  });

  it('debe crear una tasa válida cuando se usa fromDecimalFraction(0.12)', () => {
    const rate = InterestRate.fromDecimalFraction(0.12);
    expect(rate.annualPercentage().toString()).toBe('12');
  });

  it('debe crear una tasa válida cuando el valor es 0% (caso límite)', () => {
    const rate = InterestRate.fromPercentage(0);
    expect(rate.annualValue().toString()).toBe('0');
  });

  it('debe lanzar NegativeAmountError cuando la tasa anual es negativa', () => {
    expect(() => InterestRate.fromPercentage(-5)).toThrow(NegativeAmountError);
  });

  it('debe lanzar InvalidInputError cuando la tasa es NaN', () => {
    expect(() => InterestRate.fromPercentage(new Decimal('NaN'))).toThrow(InvalidInputError);
  });

  it('debe lanzar InvalidInputError cuando la tasa es Infinity', () => {
    expect(() => InterestRate.fromPercentage(Infinity)).toThrow(InvalidInputError);
  });

  it('debe lanzar OutOfRangeError cuando la tasa excede MAX_ANNUAL_RATE', () => {
    expect(() => InterestRate.fromDecimalFraction(1.5)).toThrow(OutOfRangeError);
  });

  it('debe aceptar el valor exactamente igual a MAX_ANNUAL_RATE (límite superior válido)', () => {
    const rate = InterestRate.fromDecimalFraction(InterestRate.MAX_ANNUAL_RATE);
    expect(rate.annualValue().toString()).toBe(InterestRate.MAX_ANNUAL_RATE.toString());
  });
});

describe('InterestRate#toMonthlyNominal', () => {
  it('debe dividir la tasa anual entre 12 cuando la tasa es positiva', () => {
    const rate = InterestRate.fromPercentage(12);
    const monthly = rate.toMonthlyNominal();
    expect(monthly.toString()).toBe('0.01');
  });

  it('debe devolver 0 cuando la tasa anual es 0%', () => {
    const rate = InterestRate.fromPercentage(0);
    const monthly = rate.toMonthlyNominal();
    expect(monthly.toString()).toBe('0');
  });
});

describe('InterestRate#toMonthlyEffective', () => {
  it('debe calcular (1+i)^(1/12)-1 cuando la tasa es positiva', () => {
    const rate = InterestRate.fromPercentage(12);
    const monthly = rate.toMonthlyEffective();
    // (1.12)^(1/12) - 1 ≈ 0.009488...
    expect(monthly.toNumber()).toBeCloseTo(0.009489, 5);
  });

  it('debe devolver 0 cuando la tasa anual es 0%', () => {
    const rate = InterestRate.fromPercentage(0);
    const monthly = rate.toMonthlyEffective();
    expect(monthly.toString()).toBe('0');
  });

  it('debe producir una tasa mensual menor que la nominal cuando la tasa anual es mayor a 0% (capitalización compuesta)', () => {
    // Para que una tasa mensual compuesta 12 veces alcance la misma tasa anual efectiva,
    // la tasa mensual necesaria es menor que la simple división (i/12), por convexidad
    // de la capitalización compuesta: (1+r)^12 - 1 > 12r para r > 0.
    const rate = InterestRate.fromPercentage(12);
    const nominal = rate.toMonthlyNominal();
    const effective = rate.toMonthlyEffective();
    expect(effective.lessThan(nominal)).toBe(true);
  });
});

describe('InterestRate#toMonthly (dispatcher)', () => {
  it('debe delegar en toMonthlyNominal cuando se invoca con method "nominal"', () => {
    const rate = InterestRate.fromPercentage(12);
    expect(rate.toMonthly('nominal').toString()).toBe(rate.toMonthlyNominal().toString());
  });

  it('debe delegar en toMonthlyEffective cuando se invoca con method "effective"', () => {
    const rate = InterestRate.fromPercentage(12);
    expect(rate.toMonthly('effective').toString()).toBe(rate.toMonthlyEffective().toString());
  });
});

describe('InterestRate — exposición e inmutabilidad', () => {
  it('debe exponer annualValue como fracción decimal', () => {
    const rate = InterestRate.fromPercentage(15);
    expect(rate.annualValue().toString()).toBe('0.15');
  });

  it('debe exponer annualPercentage como porcentaje', () => {
    const rate = InterestRate.fromDecimalFraction(0.15);
    expect(rate.annualPercentage().toString()).toBe('15');
  });

  it('no debe mutar la instancia original cuando se invocan los métodos de conversión', () => {
    const rate = InterestRate.fromPercentage(12);
    rate.toMonthlyNominal();
    rate.toMonthlyEffective();
    expect(rate.annualValue().toString()).toBe('0.12');
  });
});
