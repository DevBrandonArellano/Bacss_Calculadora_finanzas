import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SavingsChart } from './SavingsChart';
import { Money } from '../../../domain/shared/money';

describe('SavingsChart', () => {
  it('debe mostrar un mensaje cuando no hay abonos aplicados (savings null)', () => {
    render(<SavingsChart savings={null} />);
    expect(screen.getByText(/aplica un abono extraordinario/i)).toBeInTheDocument();
  });

  it('debe renderizar una barra con el ahorro de intereses y el texto de meses ahorrados', () => {
    const { container } = render(
      <SavingsChart savings={{ interestSaved: Money.of('1234.56', 'USD'), monthsSaved: 3 }} />,
    );

    const bars = container.querySelectorAll('.recharts-bar');
    expect(bars).toHaveLength(1);
    expect(screen.getByText(/3 meses/i)).toBeInTheDocument();
  });

  it('debe mostrar el monto ahorrado en texto explícito, no solo en la barra', () => {
    render(
      <SavingsChart savings={{ interestSaved: Money.of('1234.56', 'USD'), monthsSaved: 3 }} />,
    );

    expect(screen.getByText(/1234\.56/)).toBeInTheDocument();
    expect(screen.getAllByText(/ahorr[aá]s/i).length).toBeGreaterThan(0);
  });
});
