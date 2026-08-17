import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BalanceEvolutionChart } from './BalanceEvolutionChart';
import { FrenchAmortization } from '../../../domain/loans/frenchAmortization';
import { Money } from '../../../domain/shared/money';
import { Term } from '../../../domain/shared/term';
import Decimal from 'decimal.js';

const START_DATE = new Date('2026-01-15T00:00:00.000Z');

function generateRows(termMonths: number) {
  return new FrenchAmortization().generate({
    principal: Money.of('10000', 'USD'),
    monthlyRate: new Decimal('0.01'),
    term: Term.ofMonths(termMonths),
    startDate: START_DATE,
  });
}

describe('BalanceEvolutionChart', () => {
  it('debe mostrar un mensaje cuando no hay datos', () => {
    render(<BalanceEvolutionChart baseline={[]} />);
    expect(screen.getByText(/sin datos/i)).toBeInTheDocument();
  });

  it('debe renderizar una sola línea (saldo base) cuando no hay abonos', () => {
    const { container } = render(<BalanceEvolutionChart baseline={generateRows(6)} />);

    const lines = container.querySelectorAll('.recharts-line-curve');
    expect(lines).toHaveLength(1);
  });

  it('debe renderizar dos líneas (sin abonos vs con abonos) cuando se pasa withExtraPayments', () => {
    const baseline = generateRows(6);
    const withExtraPayments = generateRows(4).map((row) => ({
      ...row,
      extraPayment: Money.zero('USD'),
      totalPrincipalPaid: row.principalPaid,
    }));

    const { container } = render(
      <BalanceEvolutionChart baseline={baseline} withExtraPayments={withExtraPayments} />,
    );

    const lines = container.querySelectorAll('.recharts-line-curve');
    expect(lines).toHaveLength(2);
  });

  it('debe mostrar una descripción de cómo leer el gráfico', () => {
    render(<BalanceEvolutionChart baseline={generateRows(6)} />);

    expect(screen.getByText(/saldo pendiente/i)).toBeInTheDocument();
  });

  it('debe mostrar una conclusión con los meses de diferencia cuando hay abonos', () => {
    const baseline = generateRows(6);
    const withExtraPayments = generateRows(4).map((row) => ({
      ...row,
      extraPayment: Money.zero('USD'),
      totalPrincipalPaid: row.principalPaid,
    }));

    render(<BalanceEvolutionChart baseline={baseline} withExtraPayments={withExtraPayments} />);

    expect(screen.getByText(/2 meses antes/i)).toBeInTheDocument();
  });

  it('no debe mostrar la conclusión de meses cuando no hay abonos', () => {
    render(<BalanceEvolutionChart baseline={generateRows(6)} />);

    expect(screen.queryByText(/meses antes/i)).not.toBeInTheDocument();
  });
});
