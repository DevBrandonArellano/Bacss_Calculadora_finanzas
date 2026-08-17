import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';
import { addMonths } from 'date-fns';
import { FrenchAmortization } from './frenchAmortization';
import { Money } from '../shared/money';
import { Term } from '../shared/term';
import { InterestRate } from '../shared/interestRate';

const START_DATE = new Date('2026-01-15T00:00:00.000Z');

function must<T>(value: T | undefined): T {
  if (value === undefined) {
    throw new Error('Unexpected undefined value in test');
  }
  return value;
}

describe('FrenchAmortization — tasa 0% (caso especial)', () => {
  it('debe generar cuotas exactas de P/n cuando la división es exacta y la tasa es 0%', () => {
    const system = new FrenchAmortization();
    const rows = system.generate({
      principal: Money.of('12000', 'USD'),
      monthlyRate: new Decimal(0),
      term: Term.ofMonths(12),
      startDate: START_DATE,
    });

    expect(rows).toHaveLength(12);
    for (const row of rows) {
      expect(row.installment.toFixed(2)).toBe('1000.00');
      expect(row.interest.toFixed(2)).toBe('0.00');
      expect(row.principalPaid.toFixed(2)).toBe('1000.00');
    }
    expect(must(rows.at(-1)).remainingBalance.isZero()).toBe(true);
  });

  it('debe ajustar la última cuota cuando la división no es exacta y la tasa es 0%', () => {
    const system = new FrenchAmortization();
    const rows = system.generate({
      principal: Money.of('10000', 'USD'),
      monthlyRate: new Decimal(0),
      term: Term.ofMonths(3),
      startDate: START_DATE,
    });

    expect(rows).toHaveLength(3);
    expect(must(rows[0]).principalPaid.toFixed(2)).toBe('3333.33');
    expect(must(rows[1]).principalPaid.toFixed(2)).toBe('3333.33');
    // La última fila absorbe el residuo: 10000 - 3333.33*2 = 3333.34
    expect(must(rows[2]).principalPaid.toFixed(2)).toBe('3333.34');
    expect(must(rows.at(-1)).remainingBalance.isZero()).toBe(true);

    const sumPrincipal = rows.reduce((acc, r) => acc.add(r.principalPaid), Money.zero('USD'));
    expect(sumPrincipal.toFixed(2)).toBe('10000.00');
  });
});

describe('FrenchAmortization — valor límite: plazo = 1 mes', () => {
  it('debe producir una única cuota = principal + interés de un mes', () => {
    const system = new FrenchAmortization();
    const rows = system.generate({
      principal: Money.of('5000', 'USD'),
      monthlyRate: new Decimal('0.01'),
      term: Term.ofMonths(1),
      startDate: START_DATE,
    });

    expect(rows).toHaveLength(1);
    const row = must(rows[0]);
    expect(row.interest.toFixed(2)).toBe('50.00');
    expect(row.principalPaid.toFixed(2)).toBe('5000.00');
    expect(row.installment.toFixed(2)).toBe('5050.00');
    expect(row.remainingBalance.isZero()).toBe(true);
  });
});

describe('FrenchAmortization — Caso 1: francés básico (verificado independientemente)', () => {
  // Principal 10000 USD, tasa mensual 1% exacto (12% anual nominal / 12), 12 meses.
  // Tabla calculada de forma independiente con la fórmula estándar C = P*i/(1-(1+i)^-n)
  // y redondeo half-to-even por fila, fuera de este código de producción.
  const EXPECTED_ROWS = [
    { period: 1, interest: '100.00', principalPaid: '788.49', balance: '9211.51' },
    { period: 2, interest: '92.12', principalPaid: '796.37', balance: '8415.14' },
    { period: 3, interest: '84.15', principalPaid: '804.34', balance: '7610.80' },
    { period: 4, interest: '76.11', principalPaid: '812.38', balance: '6798.42' },
    { period: 5, interest: '67.98', principalPaid: '820.51', balance: '5977.91' },
    { period: 6, interest: '59.78', principalPaid: '828.71', balance: '5149.20' },
    { period: 7, interest: '51.49', principalPaid: '837.00', balance: '4312.20' },
    { period: 8, interest: '43.12', principalPaid: '845.37', balance: '3466.83' },
    { period: 9, interest: '34.67', principalPaid: '853.82', balance: '2613.01' },
    { period: 10, interest: '26.13', principalPaid: '862.36', balance: '1750.65' },
    { period: 11, interest: '17.51', principalPaid: '870.98', balance: '879.67' },
    { period: 12, interest: '8.80', principalPaid: '879.67', balance: '0.00' },
  ];

  it('debe generar la tabla de amortización exacta verificada de forma independiente', () => {
    const system = new FrenchAmortization();
    const rows = system.generate({
      principal: Money.of('10000', 'USD'),
      monthlyRate: new Decimal('0.01'),
      term: Term.ofMonths(12),
      startDate: START_DATE,
    });

    expect(rows).toHaveLength(12);

    for (const [index, expectedRow] of EXPECTED_ROWS.entries()) {
      const row = must(rows[index]);
      expect(row.periodNumber).toBe(expectedRow.period);
      expect(row.interest.toFixed(2)).toBe(expectedRow.interest);
      expect(row.principalPaid.toFixed(2)).toBe(expectedRow.principalPaid);
      expect(row.remainingBalance.toFixed(2)).toBe(expectedRow.balance);
    }
  });

  it('debe usar la misma cuota constante 888.49 en todas las filas salvo la última (ajustada a 888.47)', () => {
    const system = new FrenchAmortization();
    const rows = system.generate({
      principal: Money.of('10000', 'USD'),
      monthlyRate: new Decimal('0.01'),
      term: Term.ofMonths(12),
      startDate: START_DATE,
    });

    for (const row of rows.slice(0, -1)) {
      expect(row.installment.toFixed(2)).toBe('888.49');
    }
    expect(must(rows.at(-1)).installment.toFixed(2)).toBe('888.47');
  });

  it('debe cerrar el saldo final exactamente en 0 y la suma de capital debe igualar el principal', () => {
    const system = new FrenchAmortization();
    const principal = Money.of('10000', 'USD');
    const rows = system.generate({
      principal,
      monthlyRate: new Decimal('0.01'),
      term: Term.ofMonths(12),
      startDate: START_DATE,
    });

    expect(must(rows.at(-1)).remainingBalance.isZero()).toBe(true);

    const sumPrincipal = rows.reduce((acc, r) => acc.add(r.principalPaid), Money.zero('USD'));
    expect(sumPrincipal.equals(principal)).toBe(true);
  });
});

describe('FrenchAmortization — fechas por periodo', () => {
  it('debe asignar la fecha addMonths(startDate, periodNumber) a cada fila', () => {
    const system = new FrenchAmortization();
    const rows = system.generate({
      principal: Money.of('1000', 'USD'),
      monthlyRate: new Decimal('0.01'),
      term: Term.ofMonths(3),
      startDate: START_DATE,
    });

    expect(must(rows[0]).date.getTime()).toBe(addMonths(START_DATE, 1).getTime());
    expect(must(rows[1]).date.getTime()).toBe(addMonths(START_DATE, 2).getTime());
    expect(must(rows[2]).date.getTime()).toBe(addMonths(START_DATE, 3).getTime());
  });

  it('debe calcular correctamente la fecha cuando el plazo cruza el fin de año', () => {
    const system = new FrenchAmortization();
    const novemberStart = new Date('2026-11-15T00:00:00.000Z');
    const rows = system.generate({
      principal: Money.of('1000', 'USD'),
      monthlyRate: new Decimal('0.01'),
      term: Term.ofMonths(4),
      startDate: novemberStart,
    });

    const lastRow = must(rows.at(-1));
    expect(lastRow.date.getUTCFullYear()).toBe(2027);
    expect(lastRow.date.getUTCMonth()).toBe(2); // marzo (0-indexado)
  });
});

describe('FrenchAmortization — valores límite adicionales', () => {
  it('debe generar correctamente el plazo máximo de 600 meses', () => {
    const system = new FrenchAmortization();
    const rows = system.generate({
      principal: Money.of('100000', 'USD'),
      monthlyRate: new Decimal('0.005'),
      term: Term.ofMonths(Term.MAX_MONTHS),
      startDate: START_DATE,
    });

    expect(rows).toHaveLength(600);
    expect(must(rows.at(-1)).remainingBalance.isZero()).toBe(true);
  });

  it('debe manejar correctamente la tasa máxima permitida (100% anual)', () => {
    const system = new FrenchAmortization();
    const rate = InterestRate.fromDecimalFraction(InterestRate.MAX_ANNUAL_RATE);
    const monthlyRate = rate.toMonthlyNominal();

    const rows = system.generate({
      principal: Money.of('1000', 'USD'),
      monthlyRate,
      term: Term.ofMonths(6),
      startDate: START_DATE,
    });

    expect(rows).toHaveLength(6);
    expect(must(rows.at(-1)).remainingBalance.isZero()).toBe(true);
  });

  it('no debe producir capital ni cuota negativos cuando el principal es muy pequeño y el plazo es largo', () => {
    const system = new FrenchAmortization();
    const rows = system.generate({
      principal: Money.of('1', 'USD'),
      monthlyRate: new Decimal('0.01'),
      term: Term.ofMonths(60),
      startDate: START_DATE,
    });

    for (const row of rows) {
      expect(row.principalPaid.isNegative()).toBe(false);
      expect(row.installment.isNegative()).toBe(false);
    }
    expect(must(rows.at(-1)).remainingBalance.isZero()).toBe(true);
  });
});
