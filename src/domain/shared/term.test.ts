import { describe, it, expect } from 'vitest';
import { Term } from './term';
import { InvalidInputError, OutOfRangeError } from './errors';

describe('Term.ofMonths', () => {
  it('debe crear un Term válido con un entero positivo', () => {
    const term = Term.ofMonths(24);
    expect(term.toMonths()).toBe(24);
  });

  it('debe aceptar 1 como plazo mínimo válido (caso límite explícito)', () => {
    const term = Term.ofMonths(1);
    expect(term.toMonths()).toBe(1);
  });

  it('debe aceptar MAX_MONTHS como límite superior válido', () => {
    const term = Term.ofMonths(Term.MAX_MONTHS);
    expect(term.toMonths()).toBe(Term.MAX_MONTHS);
  });

  it('debe lanzar InvalidInputError cuando el valor no es entero', () => {
    expect(() => Term.ofMonths(3.5)).toThrow(InvalidInputError);
  });

  it('debe lanzar InvalidInputError cuando el valor es 0', () => {
    expect(() => Term.ofMonths(0)).toThrow(InvalidInputError);
  });

  it('debe lanzar InvalidInputError cuando el valor es negativo', () => {
    expect(() => Term.ofMonths(-5)).toThrow(InvalidInputError);
  });

  it('debe lanzar OutOfRangeError cuando el valor excede MAX_MONTHS', () => {
    expect(() => Term.ofMonths(Term.MAX_MONTHS + 1)).toThrow(OutOfRangeError);
  });
});

describe('Term.ofYears', () => {
  it('debe normalizar 1 año a 12 meses', () => {
    const term = Term.ofYears(1);
    expect(term.toMonths()).toBe(12);
  });

  it('debe normalizar 2.5 años a 30 meses (fracción que produce entero exacto de meses)', () => {
    const term = Term.ofYears(2.5);
    expect(term.toMonths()).toBe(30);
  });

  it('debe lanzar InvalidInputError cuando la fracción de años no produce un entero de meses', () => {
    expect(() => Term.ofYears(2.3)).toThrow(InvalidInputError);
  });
});

describe('Term#toYears', () => {
  it('debe devolver 1.5 cuando el Term es de 18 meses', () => {
    const term = Term.ofMonths(18);
    expect(term.toYears()).toBe(1.5);
  });
});

describe('Term — inmutabilidad', () => {
  it('no debe exponer una forma de mutar months una vez creado el Term', () => {
    const term = Term.ofMonths(12);
    expect(term.toMonths()).toBe(12);
    // No hay setter público; toMonths() siempre debe devolver el mismo valor
    expect(term.toMonths()).toBe(12);
  });
});
