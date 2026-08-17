import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CapitalVsInterestChart } from './CapitalVsInterestChart';
import { AmortizationEngine } from '../../../domain/loans/amortizationEngine';
import { FrenchAmortization } from '../../../domain/loans/frenchAmortization';
import { Money } from '../../../domain/shared/money';
import { InterestRate } from '../../../domain/shared/interestRate';
import { Term } from '../../../domain/shared/term';

const START_DATE = new Date('2026-01-15T00:00:00.000Z');

function runLoan(termMonths: number) {
  return AmortizationEngine.run({
    system: new FrenchAmortization(),
    principal: Money.of('10000', 'USD'),
    annualRate: InterestRate.fromPercentage('12'),
    rateConversionMethod: 'nominal',
    term: Term.ofMonths(termMonths),
    startDate: START_DATE,
  });
}

describe('CapitalVsInterestChart', () => {
  it('debe renderizar una sola serie de barras (original) cuando no hay comparación', () => {
    const { container } = render(<CapitalVsInterestChart baseline={runLoan(12).summary} />);

    const bars = container.querySelectorAll('.recharts-bar');
    expect(bars).toHaveLength(1);
  });

  it('debe renderizar dos series de barras cuando hay withExtraPayments', () => {
    const { container } = render(
      <CapitalVsInterestChart
        baseline={runLoan(12).summary}
        withExtraPayments={runLoan(9).summary}
      />,
    );

    const bars = container.querySelectorAll('.recharts-bar');
    expect(bars).toHaveLength(2);
  });

  it('debe mostrar las categorías Capital e Interés', () => {
    render(<CapitalVsInterestChart baseline={runLoan(12).summary} />);

    expect(screen.getAllByText('Capital').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Interés').length).toBeGreaterThan(0);
  });

  it('debe mostrar una descripción y el porcentaje de interés sobre el total pagado', () => {
    const summary = runLoan(12).summary;
    render(<CapitalVsInterestChart baseline={summary} />);

    expect(screen.getByText(/cu[aá]nto del total pagado es capital/i)).toBeInTheDocument();

    const interestPercent = summary.totalInterest
      .toDecimal()
      .dividedBy(summary.totalPaid.toDecimal())
      .times(100);
    expect(screen.getByText(new RegExp(`${interestPercent.toFixed(1)}%`))).toBeInTheDocument();
  });
});
