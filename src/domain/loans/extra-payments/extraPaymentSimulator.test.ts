import { describe, it, expect } from 'vitest';
import { simulateExtraPayments } from './extraPaymentSimulator';
import { ReducePaymentStrategy } from './reducePaymentStrategy';
import { ReduceTermStrategy } from './reduceTermStrategy';
import { FrenchAmortization } from '../frenchAmortization';
import { GermanAmortization } from '../germanAmortization';
import { Money } from '../../shared/money';
import { InterestRate } from '../../shared/interestRate';
import { Term } from '../../shared/term';
import { InvalidInputError, CurrencyMismatchError } from '../../shared/errors';

const START_DATE = new Date('2026-01-15T00:00:00.000Z');

function must<T>(value: T | undefined): T {
  if (value === undefined) {
    throw new Error('Unexpected undefined value in test');
  }
  return value;
}

function baseRequest(system: FrenchAmortization | GermanAmortization) {
  return {
    system,
    principal: Money.of('10000', 'USD'),
    annualRate: InterestRate.fromPercentage('12'),
    rateConversionMethod: 'nominal' as const,
    term: Term.ofMonths(12),
    startDate: START_DATE,
  };
}

describe('simulateExtraPayments — Caso 7: abono único, francés, ReducePaymentStrategy', () => {
  it('debe mantener el plazo original (monthsSaved=0) y reducir la cuota', () => {
    const result = simulateExtraPayments({
      baseRequest: baseRequest(new FrenchAmortization()),
      strategy: new ReducePaymentStrategy(),
      extraPayments: [{ periodNumber: 3, amount: Money.of('2000', 'USD') }],
    });

    expect(result.withExtraPayments.schedule).toHaveLength(12);
    expect(result.monthsSaved).toBe(0);
    expect(result.withExtraPayments.summary.totalInterest.toFixed(2)).toBe('560.53');
    expect(result.interestSaved.toFixed(2)).toBe('101.33');
  });

  it('debe decorar la fila del abono con extraPayment y totalPrincipalPaid correctos', () => {
    const result = simulateExtraPayments({
      baseRequest: baseRequest(new FrenchAmortization()),
      strategy: new ReducePaymentStrategy(),
      extraPayments: [{ periodNumber: 3, amount: Money.of('2000', 'USD') }],
    });

    const row3 = must(result.withExtraPayments.schedule[2]);
    expect(row3.extraPayment.toFixed(2)).toBe('2000.00');
    expect(row3.remainingBalance.toFixed(2)).toBe('5610.80');
    expect(row3.totalPrincipalPaid.toFixed(2)).toBe(
      row3.principalPaid.add(row3.extraPayment).toFixed(2),
    );

    for (const [index, row] of result.withExtraPayments.schedule.entries()) {
      if (index !== 2) {
        expect(row.extraPayment.isZero()).toBe(true);
      }
    }
  });

  it('debe cerrar el saldo final en 0 y no producir saldo negativo en ninguna fila', () => {
    const result = simulateExtraPayments({
      baseRequest: baseRequest(new FrenchAmortization()),
      strategy: new ReducePaymentStrategy(),
      extraPayments: [{ periodNumber: 3, amount: Money.of('2000', 'USD') }],
    });

    expect(must(result.withExtraPayments.schedule.at(-1)).remainingBalance.isZero()).toBe(true);
    for (const row of result.withExtraPayments.schedule) {
      expect(row.remainingBalance.isNegative()).toBe(false);
    }
  });
});

describe('simulateExtraPayments — Caso 5: múltiples abonos, francés, ReducePaymentStrategy', () => {
  it('debe aplicar dos abonos consecutivos correctamente', () => {
    const result = simulateExtraPayments({
      baseRequest: baseRequest(new FrenchAmortization()),
      strategy: new ReducePaymentStrategy(),
      extraPayments: [
        { periodNumber: 3, amount: Money.of('2000', 'USD') },
        { periodNumber: 6, amount: Money.of('1000', 'USD') },
      ],
    });

    expect(result.withExtraPayments.schedule).toHaveLength(12);
    const row3 = must(result.withExtraPayments.schedule[2]);
    const row6 = must(result.withExtraPayments.schedule[5]);
    expect(row3.extraPayment.toFixed(2)).toBe('2000.00');
    expect(row6.extraPayment.toFixed(2)).toBe('1000.00');
    expect(must(result.withExtraPayments.schedule.at(-1)).remainingBalance.isZero()).toBe(true);

    const sumTotalPrincipal = result.withExtraPayments.schedule.reduce(
      (acc, r) => acc.add(r.totalPrincipalPaid),
      Money.zero('USD'),
    );
    expect(sumTotalPrincipal.toFixed(2)).toBe('10000.00');
  });
});

describe('simulateExtraPayments — Caso 4/6: abono único, francés, ReduceTermStrategy', () => {
  it('debe reducir el plazo (monthsSaved=2) verificado independientemente', () => {
    const result = simulateExtraPayments({
      baseRequest: baseRequest(new FrenchAmortization()),
      strategy: new ReduceTermStrategy(),
      extraPayments: [{ periodNumber: 3, amount: Money.of('2000', 'USD') }],
    });

    expect(result.withExtraPayments.schedule).toHaveLength(10);
    expect(result.monthsSaved).toBe(2);
    expect(result.withExtraPayments.summary.totalInterest.toFixed(2)).toBe('502.94');
    expect(result.interestSaved.toFixed(2)).toBe('158.92');
  });

  it('Caso 9: el préstamo debe terminar antes del plazo original', () => {
    const result = simulateExtraPayments({
      baseRequest: baseRequest(new FrenchAmortization()),
      strategy: new ReduceTermStrategy(),
      extraPayments: [{ periodNumber: 3, amount: Money.of('2000', 'USD') }],
    });

    expect(result.withExtraPayments.schedule.length).toBeLessThan(result.baseline.schedule.length);
  });
});

describe('simulateExtraPayments — Caso 10: abono >= saldo pendiente (liquidación anticipada)', () => {
  it('debe truncar el abono al saldo exacto y terminar el préstamo sin filas adicionales', () => {
    const result = simulateExtraPayments({
      baseRequest: baseRequest(new FrenchAmortization()),
      strategy: new ReduceTermStrategy(),
      extraPayments: [{ periodNumber: 3, amount: Money.of('8000', 'USD') }],
    });

    expect(result.withExtraPayments.schedule).toHaveLength(3);
    const lastRow = must(result.withExtraPayments.schedule.at(-1));
    expect(lastRow.extraPayment.toFixed(2)).toBe('7610.80'); // truncado, no los 8000 solicitados
    expect(lastRow.remainingBalance.isZero()).toBe(true);
  });

  it('debe funcionar igual con ReducePaymentStrategy (la liquidación anticipada no depende de la estrategia)', () => {
    const result = simulateExtraPayments({
      baseRequest: baseRequest(new GermanAmortization()),
      strategy: new ReducePaymentStrategy(),
      extraPayments: [{ periodNumber: 3, amount: Money.of('8000', 'USD') }],
    });

    expect(must(result.withExtraPayments.schedule.at(-1)).remainingBalance.isZero()).toBe(true);
    expect(result.withExtraPayments.schedule.length).toBeLessThan(12);
  });
});

describe('simulateExtraPayments — contrato LSP entre sistemas (francés/alemán)', () => {
  const systems: readonly (readonly [string, FrenchAmortization | GermanAmortization])[] = [
    ['FrenchAmortization', new FrenchAmortization()],
    ['GermanAmortization', new GermanAmortization()],
  ];

  it.each(systems)(
    '%s + ReduceTermStrategy con abono único cierra correctamente',
    (_name, system) => {
      const result = simulateExtraPayments({
        baseRequest: baseRequest(system),
        strategy: new ReduceTermStrategy(),
        extraPayments: [{ periodNumber: 3, amount: Money.of('2000', 'USD') }],
      });

      expect(must(result.withExtraPayments.schedule.at(-1)).remainingBalance.isZero()).toBe(true);
      expect(result.withExtraPayments.schedule.length).toBeLessThanOrEqual(12);
      for (const row of result.withExtraPayments.schedule) {
        expect(row.remainingBalance.isNegative()).toBe(false);
        expect(row.totalPrincipalPaid.isNegative()).toBe(false);
      }
    },
  );
});

describe('simulateExtraPayments — validación de errores', () => {
  it('debe lanzar InvalidInputError cuando un abono tiene periodNumber fuera de rango', () => {
    expect(() =>
      simulateExtraPayments({
        baseRequest: baseRequest(new FrenchAmortization()),
        strategy: new ReducePaymentStrategy(),
        extraPayments: [{ periodNumber: 20, amount: Money.of('100', 'USD') }],
      }),
    ).toThrow(InvalidInputError);
  });

  it('debe lanzar CurrencyMismatchError cuando la moneda del abono no coincide', () => {
    expect(() =>
      simulateExtraPayments({
        baseRequest: baseRequest(new FrenchAmortization()),
        strategy: new ReducePaymentStrategy(),
        extraPayments: [{ periodNumber: 3, amount: Money.of('100', 'EUR') }],
      }),
    ).toThrow(CurrencyMismatchError);
  });
});

describe('simulateExtraPayments — Caso 8: aporte recurrente mensual, francés, ReduceTermStrategy', () => {
  it('debe reducir el plazo a 8 meses y ahorrar 256.37 en intereses (verificado independientemente)', () => {
    // Nota: la cuota de referencia para la búsqueda binaria de ReduceTermStrategy
    // es la cuota REAL del segmento vigente en cada periodo (no la cuota original
    // fija) — por diseño de Fase 4 ("referenceInstallment: paymentRow.installment").
    // Con aportes recurrentes, esa referencia desciende cada vez que el plazo se
    // recorta, así que el fixture se verificó con un script que replica ese mismo
    // comportamiento de "referencia móvil", no con la cuota fija de 888.49.
    const result = simulateExtraPayments({
      baseRequest: baseRequest(new FrenchAmortization()),
      strategy: new ReduceTermStrategy(),
      extraPayments: [],
      recurringContributions: [{ amount: Money.of('700', 'USD'), startPeriod: 1, endPeriod: 12 }],
    });

    expect(result.withExtraPayments.schedule).toHaveLength(8);
    expect(result.monthsSaved).toBe(4);
    expect(result.withExtraPayments.summary.totalInterest.toFixed(2)).toBe('405.49');
    expect(result.interestSaved.toFixed(2)).toBe('256.37');

    // Fecha estimada de fin: 8 meses después del inicio.
    const lastRow = must(result.withExtraPayments.schedule.at(-1));
    expect(lastRow.date.getTime()).toEqual(
      new Date(
        Date.UTC(
          START_DATE.getUTCFullYear(),
          START_DATE.getUTCMonth() + 8,
          START_DATE.getUTCDate(),
        ),
      ).getTime(),
    );

    const sumTotalPrincipal = result.withExtraPayments.schedule.reduce(
      (acc, r) => acc.add(r.totalPrincipalPaid),
      Money.zero('USD'),
    );
    expect(sumTotalPrincipal.toFixed(2)).toBe('10000.00');
  });

  it('debe coexistir un abono único con un aporte recurrente en el mismo schedule', () => {
    const result = simulateExtraPayments({
      baseRequest: baseRequest(new FrenchAmortization()),
      strategy: new ReducePaymentStrategy(),
      extraPayments: [{ periodNumber: 5, amount: Money.of('300', 'USD') }],
      recurringContributions: [{ amount: Money.of('50', 'USD'), startPeriod: 1, endPeriod: 12 }],
    });

    // Periodo 5 debe tener 300 (único) + 50 (recurrente) = 350 fusionados.
    const row5 = must(result.withExtraPayments.schedule[4]);
    expect(row5.extraPayment.toFixed(2)).toBe('350.00');
    expect(must(result.withExtraPayments.schedule.at(-1)).remainingBalance.isZero()).toBe(true);
  });

  it('debe omitir silenciosamente los periodos de aporte recurrente que caen después del fin anticipado del préstamo', () => {
    // Aporte recurrente hasta el periodo 12, pero un abono grande en el periodo 3 liquida el préstamo antes.
    const run = () =>
      simulateExtraPayments({
        baseRequest: baseRequest(new FrenchAmortization()),
        strategy: new ReducePaymentStrategy(),
        extraPayments: [{ periodNumber: 3, amount: Money.of('8000', 'USD') }],
        recurringContributions: [{ amount: Money.of('50', 'USD'), startPeriod: 1, endPeriod: 12 }],
      });

    expect(run).not.toThrow();
    const result = run();
    expect(must(result.withExtraPayments.schedule.at(-1)).remainingBalance.isZero()).toBe(true);
  });
});
