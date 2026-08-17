import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StrategyComparisonChart } from './StrategyComparisonChart';
import { FrenchAmortization } from '../../../domain/loans/frenchAmortization';
import { Money } from '../../../domain/shared/money';
import { InterestRate } from '../../../domain/shared/interestRate';
import { Term } from '../../../domain/shared/term';
import type { AmortizationRequest } from '../../../domain/loans/amortizationEngine';

const START_DATE = new Date('2026-01-15T00:00:00.000Z');

function baseRequest(): AmortizationRequest {
  return {
    system: new FrenchAmortization(),
    principal: Money.of('10000', 'USD'),
    annualRate: InterestRate.fromPercentage('12'),
    rateConversionMethod: 'nominal',
    term: Term.ofMonths(24),
    startDate: START_DATE,
  };
}

describe('StrategyComparisonChart', () => {
  it('debe renderizar dos líneas (reducir plazo vs reducir cuota) recalculando ambas estrategias', () => {
    const { container } = render(
      <StrategyComparisonChart
        baseRequest={baseRequest()}
        extraPayments={[{ periodNumber: 6, amount: Money.of('2000', 'USD') }]}
        recurringContributions={[]}
      />,
    );

    const lines = container.querySelectorAll('.recharts-line-curve');
    expect(lines).toHaveLength(2);
  });

  it('debe mostrar una descripción y una conclusión con el mes final de cada estrategia', () => {
    render(
      <StrategyComparisonChart
        baseRequest={baseRequest()}
        extraPayments={[{ periodNumber: 6, amount: Money.of('2000', 'USD') }]}
        recurringContributions={[]}
      />,
    );

    expect(screen.getByText(/mismos aportes/i)).toBeInTheDocument();
    expect(screen.getByText(/reducir plazo.*terminás en el mes/i)).toBeInTheDocument();
    expect(screen.getByText(/reducir cuota.*mes/i)).toBeInTheDocument();
  });

  it('debe funcionar también con aportes recurrentes', () => {
    const { container } = render(
      <StrategyComparisonChart
        baseRequest={baseRequest()}
        extraPayments={[]}
        recurringContributions={[{ amount: Money.of('200', 'USD'), startPeriod: 1, endPeriod: 12 }]}
      />,
    );

    const lines = container.querySelectorAll('.recharts-line-curve');
    expect(lines).toHaveLength(2);
  });
});
