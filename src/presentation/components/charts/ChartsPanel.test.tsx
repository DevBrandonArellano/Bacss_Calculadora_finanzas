import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChartsPanel } from './ChartsPanel';
import { AmortizationEngine } from '../../../domain/loans/amortizationEngine';
import { FrenchAmortization } from '../../../domain/loans/frenchAmortization';
import { ReducePaymentStrategy } from '../../../domain/loans/extra-payments/reducePaymentStrategy';
import { ExtraPaymentSimulator } from '../../../domain/loans/extra-payments/extraPaymentSimulator';
import { Money } from '../../../domain/shared/money';
import { InterestRate } from '../../../domain/shared/interestRate';
import { Term } from '../../../domain/shared/term';
import type { AmortizationRequest } from '../../../domain/loans/amortizationEngine';
import type { LoanResult } from '../../state/loanStore';

const START_DATE = new Date('2026-01-15T00:00:00.000Z');

function baseRequest(): AmortizationRequest {
  return {
    system: new FrenchAmortization(),
    principal: Money.of('10000', 'USD'),
    annualRate: InterestRate.fromPercentage('12'),
    rateConversionMethod: 'nominal',
    term: Term.ofMonths(12),
    startDate: START_DATE,
  };
}

describe('ChartsPanel', () => {
  it('debe mostrar un mensaje cuando no hay resultado', () => {
    render(<ChartsPanel result={null} baseRequest={null} extraPaymentInputs={null} />);
    expect(screen.getByText(/completa el formulario/i)).toBeInTheDocument();
  });

  it('debe renderizar los 5 gráficos con un resultado simple (sin abonos)', () => {
    const data = AmortizationEngine.run(baseRequest());
    const result: LoanResult = { kind: 'simple', data };

    render(<ChartsPanel result={result} baseRequest={baseRequest()} extraPaymentInputs={null} />);

    expect(screen.getByText('Evolución del saldo')).toBeInTheDocument();
    expect(screen.getByText('Capital vs intereses')).toBeInTheDocument();
    expect(screen.getByText(/aplica un abono extraordinario/i)).toBeInTheDocument();
    expect(screen.getByText('Distribución de cada cuota')).toBeInTheDocument();
    expect(screen.getByText('Comparación francés vs alemán')).toBeInTheDocument();
  });

  it('debe mostrar el gráfico de ahorro cuando el resultado incluye abonos', () => {
    const comparison = ExtraPaymentSimulator.simulate({
      baseRequest: baseRequest(),
      strategy: new ReducePaymentStrategy(),
      extraPayments: [{ periodNumber: 3, amount: Money.of('2000', 'USD') }],
    });
    const result: LoanResult = { kind: 'withExtraPayments', data: comparison };

    render(<ChartsPanel result={result} baseRequest={baseRequest()} extraPaymentInputs={null} />);

    expect(screen.getByText('Ahorro generado por abonos')).toBeInTheDocument();
  });

  it('debe mostrar el gráfico de reducir plazo vs reducir cuota cuando hay abonos y extraPaymentInputs', () => {
    const extraPayments = [{ periodNumber: 3, amount: Money.of('2000', 'USD') }];
    const comparison = ExtraPaymentSimulator.simulate({
      baseRequest: baseRequest(),
      strategy: new ReducePaymentStrategy(),
      extraPayments,
    });
    const result: LoanResult = { kind: 'withExtraPayments', data: comparison };

    render(
      <ChartsPanel
        result={result}
        baseRequest={baseRequest()}
        extraPaymentInputs={{ extraPayments, recurringContributions: [] }}
      />,
    );

    expect(screen.getByText('Reducir plazo vs reducir cuota')).toBeInTheDocument();
  });

  it('no debe mostrar el gráfico de reducir plazo vs reducir cuota cuando el resultado es simple', () => {
    const data = AmortizationEngine.run(baseRequest());
    const result: LoanResult = { kind: 'simple', data };

    render(<ChartsPanel result={result} baseRequest={baseRequest()} extraPaymentInputs={null} />);

    expect(screen.queryByText('Reducir plazo vs reducir cuota')).not.toBeInTheDocument();
  });
});
