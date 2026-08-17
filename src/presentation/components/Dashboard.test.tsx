import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Dashboard } from './Dashboard';
import { AmortizationEngine } from '../../domain/loans/amortizationEngine';
import { FrenchAmortization } from '../../domain/loans/frenchAmortization';
import { ReducePaymentStrategy } from '../../domain/loans/extra-payments/reducePaymentStrategy';
import { ExtraPaymentSimulator } from '../../domain/loans/extra-payments/extraPaymentSimulator';
import { Money } from '../../domain/shared/money';
import { InterestRate } from '../../domain/shared/interestRate';
import { Term } from '../../domain/shared/term';
import type { LoanResult } from '../state/loanStore';

const START_DATE = new Date('2026-01-15T00:00:00.000Z');

function simpleResult() {
  const data = AmortizationEngine.run({
    system: new FrenchAmortization(),
    principal: Money.of('10000', 'USD'),
    annualRate: InterestRate.fromPercentage('12'),
    rateConversionMethod: 'nominal',
    term: Term.ofMonths(12),
    startDate: START_DATE,
  });
  return { kind: 'simple', data } satisfies LoanResult;
}

describe('Dashboard', () => {
  it('debe mostrar un mensaje cuando no hay resultado', () => {
    render(<Dashboard result={null} />);
    expect(screen.getByText(/completa el formulario/i)).toBeInTheDocument();
  });

  it('debe renderizar los indicadores del resumen cuando hay resultado (Caso 1)', () => {
    render(<Dashboard result={simpleResult()} />);

    expect(screen.getByText('888.49')).toBeInTheDocument();
    expect(screen.getByText('10000.00')).toBeInTheDocument();
  });

  it('debe mostrar costos opcionales y total con costos cuando optionalCosts es mayor a cero', () => {
    const result = simpleResult();

    render(<Dashboard result={result} optionalCosts={Money.of('250', 'USD')} />);

    expect(screen.getByText('Costos opcionales')).toBeInTheDocument();
    expect(screen.getByText('250.00')).toBeInTheDocument();
    expect(screen.getByText('Total con costos')).toBeInTheDocument();
    expect(
      screen.getByText(result.data.summary.totalPaid.add(Money.of('250', 'USD')).toFixed(2)),
    ).toBeInTheDocument();
  });

  it('no debe mostrar costos opcionales cuando optionalCosts es cero', () => {
    render(<Dashboard result={simpleResult()} optionalCosts={Money.zero('USD')} />);

    expect(screen.queryByText('Costos opcionales')).not.toBeInTheDocument();
  });

  it('debe mostrar el indicador de tasa cuando se pasa annualRatePercent', () => {
    render(<Dashboard result={simpleResult()} annualRatePercent="12" />);

    expect(screen.getByText('Tasa anual')).toBeInTheDocument();
    expect(screen.getByText('12%')).toBeInTheDocument();
  });

  it('debe mostrar el indicador de ahorro solo cuando hay abonos aplicados', () => {
    const comparison = ExtraPaymentSimulator.simulate({
      baseRequest: {
        system: new FrenchAmortization(),
        principal: Money.of('10000', 'USD'),
        annualRate: InterestRate.fromPercentage('12'),
        rateConversionMethod: 'nominal',
        term: Term.ofMonths(12),
        startDate: START_DATE,
      },
      strategy: new ReducePaymentStrategy(),
      extraPayments: [{ periodNumber: 3, amount: Money.of('2000', 'USD') }],
    });
    const result: LoanResult = { kind: 'withExtraPayments', data: comparison };

    render(<Dashboard result={result} />);

    expect(screen.getByText('Ahorro')).toBeInTheDocument();
    expect(
      screen.getByText(
        `${comparison.interestSaved.toFixed(2)} (${String(comparison.monthsSaved)} meses)`,
      ),
    ).toBeInTheDocument();
  });

  it('no debe mostrar el indicador de ahorro cuando el resultado es simple', () => {
    render(<Dashboard result={simpleResult()} />);

    expect(screen.queryByText('Ahorro')).not.toBeInTheDocument();
  });

  it('debe mostrar la cuota actual (no "Variable") cuando la estrategia de abono cambia la cuota', () => {
    const comparison = ExtraPaymentSimulator.simulate({
      baseRequest: {
        system: new FrenchAmortization(),
        principal: Money.of('10000', 'USD'),
        annualRate: InterestRate.fromPercentage('12'),
        rateConversionMethod: 'nominal',
        term: Term.ofMonths(12),
        startDate: START_DATE,
      },
      strategy: new ReducePaymentStrategy(),
      extraPayments: [{ periodNumber: 3, amount: Money.of('2000', 'USD') }],
    });
    const result: LoanResult = { kind: 'withExtraPayments', data: comparison };
    const lastRowInstallment = comparison.withExtraPayments.schedule.at(-1)?.installment;

    render(<Dashboard result={result} />);

    expect(screen.getByText('Cuota actual')).toBeInTheDocument();
    expect(screen.getByText(lastRowInstallment?.toFixed(2) as string)).toBeInTheDocument();
    // La cuota base (antes del abono) era mayor: reducir cuota implica que la actual es menor.
    expect(lastRowInstallment?.lessThan(comparison.baseline.summary.installment as Money)).toBe(
      true,
    );
  });
});
