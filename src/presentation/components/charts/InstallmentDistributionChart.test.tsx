import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { InstallmentDistributionChart } from './InstallmentDistributionChart';
import { FrenchAmortization } from '../../../domain/loans/frenchAmortization';
import { Money } from '../../../domain/shared/money';
import { Term } from '../../../domain/shared/term';
import Decimal from 'decimal.js';

const START_DATE = new Date('2026-01-15T00:00:00.000Z');

describe('InstallmentDistributionChart', () => {
  it('debe mostrar un mensaje cuando no hay filas', () => {
    render(<InstallmentDistributionChart rows={[]} />);
    expect(screen.getByText(/sin datos/i)).toBeInTheDocument();
  });

  it('debe renderizar dos series apiladas (interés y capital) con una barra por periodo', () => {
    const rows = new FrenchAmortization().generate({
      principal: Money.of('10000', 'USD'),
      monthlyRate: new Decimal('0.01'),
      term: Term.ofMonths(6),
      startDate: START_DATE,
    });

    const { container } = render(<InstallmentDistributionChart rows={rows} />);

    const bars = container.querySelectorAll('.recharts-bar');
    expect(bars).toHaveLength(2);
    const rectangles = container.querySelectorAll('.recharts-bar-rectangle');
    expect(rectangles).toHaveLength(12);
  });

  it('debe mostrar una descripción de cómo leer el gráfico', () => {
    const rows = new FrenchAmortization().generate({
      principal: Money.of('10000', 'USD'),
      monthlyRate: new Decimal('0.01'),
      term: Term.ofMonths(6),
      startDate: START_DATE,
    });

    render(<InstallmentDistributionChart rows={rows} />);

    expect(screen.getByText(/cada barra es una cuota/i)).toBeInTheDocument();
  });
});
