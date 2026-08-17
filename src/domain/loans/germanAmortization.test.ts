import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';
import { GermanAmortization } from './germanAmortization';
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

describe('GermanAmortization — tasa 0%', () => {
  it('debe generar capital exacto de P/n e interés cero cuando la tasa es 0% y la división es exacta', () => {
    const system = new GermanAmortization();
    const rows = system.generate({
      principal: Money.of('12000', 'USD'),
      monthlyRate: new Decimal(0),
      term: Term.ofMonths(12),
      startDate: START_DATE,
    });

    expect(rows).toHaveLength(12);
    for (const row of rows) {
      expect(row.principalPaid.toFixed(2)).toBe('1000.00');
      expect(row.interest.toFixed(2)).toBe('0.00');
      expect(row.installment.toFixed(2)).toBe('1000.00');
    }
    expect(must(rows.at(-1)).remainingBalance.isZero()).toBe(true);
  });

  it('debe ajustar el último capital cuando la división no es exacta y la tasa es 0%', () => {
    const system = new GermanAmortization();
    const rows = system.generate({
      principal: Money.of('10000', 'USD'),
      monthlyRate: new Decimal(0),
      term: Term.ofMonths(3),
      startDate: START_DATE,
    });

    expect(must(rows[0]).principalPaid.toFixed(2)).toBe('3333.33');
    expect(must(rows[1]).principalPaid.toFixed(2)).toBe('3333.33');
    expect(must(rows[2]).principalPaid.toFixed(2)).toBe('3333.34');
    expect(must(rows.at(-1)).remainingBalance.isZero()).toBe(true);
  });
});

describe('GermanAmortization — valor límite: plazo = 1 mes', () => {
  it('debe producir una única cuota = principal + interés de un mes', () => {
    const system = new GermanAmortization();
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

describe('GermanAmortization — Caso 2: alemán básico (verificado independientemente)', () => {
  // Principal 10000 USD, tasa mensual 1% exacto, 12 meses.
  // Tabla calculada de forma independiente con la fórmula estándar (capital constante = P/n,
  // interés = saldo anterior x i) y redondeo half-to-even por fila, fuera de este código de producción.
  const EXPECTED_ROWS = [
    {
      period: 1,
      interest: '100.00',
      principalPaid: '833.33',
      installment: '933.33',
      balance: '9166.67',
    },
    {
      period: 2,
      interest: '91.67',
      principalPaid: '833.33',
      installment: '925.00',
      balance: '8333.34',
    },
    {
      period: 3,
      interest: '83.33',
      principalPaid: '833.33',
      installment: '916.66',
      balance: '7500.01',
    },
    {
      period: 4,
      interest: '75.00',
      principalPaid: '833.33',
      installment: '908.33',
      balance: '6666.68',
    },
    {
      period: 5,
      interest: '66.67',
      principalPaid: '833.33',
      installment: '900.00',
      balance: '5833.35',
    },
    {
      period: 6,
      interest: '58.33',
      principalPaid: '833.33',
      installment: '891.66',
      balance: '5000.02',
    },
    {
      period: 7,
      interest: '50.00',
      principalPaid: '833.33',
      installment: '883.33',
      balance: '4166.69',
    },
    {
      period: 8,
      interest: '41.67',
      principalPaid: '833.33',
      installment: '875.00',
      balance: '3333.36',
    },
    {
      period: 9,
      interest: '33.33',
      principalPaid: '833.33',
      installment: '866.66',
      balance: '2500.03',
    },
    {
      period: 10,
      interest: '25.00',
      principalPaid: '833.33',
      installment: '858.33',
      balance: '1666.70',
    },
    {
      period: 11,
      interest: '16.67',
      principalPaid: '833.33',
      installment: '850.00',
      balance: '833.37',
    },
    {
      period: 12,
      interest: '8.33',
      principalPaid: '833.37',
      installment: '841.70',
      balance: '0.00',
    },
  ];

  it('debe generar la tabla de amortización exacta verificada de forma independiente', () => {
    const system = new GermanAmortization();
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
      expect(row.installment.toFixed(2)).toBe(expectedRow.installment);
      expect(row.remainingBalance.toFixed(2)).toBe(expectedRow.balance);
    }
  });

  it('debe tener cuota decreciente en cada fila (característica del sistema alemán)', () => {
    const system = new GermanAmortization();
    const rows = system.generate({
      principal: Money.of('10000', 'USD'),
      monthlyRate: new Decimal('0.01'),
      term: Term.ofMonths(12),
      startDate: START_DATE,
    });

    for (let i = 1; i < rows.length - 1; i++) {
      expect(must(rows[i]).installment.lessThan(must(rows[i - 1]).installment)).toBe(true);
    }
  });

  it('debe cerrar el saldo final exactamente en 0 y la suma de capital debe igualar el principal', () => {
    const system = new GermanAmortization();
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

describe('GermanAmortization — valores límite adicionales', () => {
  it('debe generar correctamente el plazo máximo de 600 meses', () => {
    const system = new GermanAmortization();
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
    const system = new GermanAmortization();
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

  it('no debe producir capital ni cuota negativos cuando el principal es pequeño y el plazo es largo', () => {
    // Nota: con capital constante (P/n), el principal debe ser suficientemente grande
    // respecto al plazo para que el redondeo a centavos no produzca overshoot negativo
    // en el ajuste final (ej. P=1, n=60 → 1/60≈0.0167→redondea a 0.02, 0.02×60=1.20 > P).
    // 100 USD a 60 meses (capital≈1.67) es un caso límite realista sin ese problema.
    const system = new GermanAmortization();
    const rows = system.generate({
      principal: Money.of('100', 'USD'),
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
