import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { SystemComparisonChart } from './SystemComparisonChart';
import { FrenchAmortization } from '../../../domain/loans/frenchAmortization';
import { Money } from '../../../domain/shared/money';
import { InterestRate } from '../../../domain/shared/interestRate';
import { Term } from '../../../domain/shared/term';
import type { AmortizationRequest } from '../../../domain/loans/amortizationEngine';

const START_DATE = new Date('2026-01-15T00:00:00.000Z');

describe('SystemComparisonChart', () => {
  it('debe renderizar dos líneas (francés y alemán) recalculando ambos sistemas desde baseRequest', () => {
    const baseRequest: AmortizationRequest = {
      system: new FrenchAmortization(),
      principal: Money.of('10000', 'USD'),
      annualRate: InterestRate.fromPercentage('12'),
      rateConversionMethod: 'nominal',
      term: Term.ofMonths(12),
      startDate: START_DATE,
    };

    const { container } = render(<SystemComparisonChart baseRequest={baseRequest} />);

    const lines = container.querySelectorAll('.recharts-line-curve');
    expect(lines).toHaveLength(2);
  });

  it('debe mostrar una descripción y una conclusión de qué sistema ahorra más intereses', () => {
    const baseRequest: AmortizationRequest = {
      system: new FrenchAmortization(),
      principal: Money.of('10000', 'USD'),
      annualRate: InterestRate.fromPercentage('12'),
      rateConversionMethod: 'nominal',
      term: Term.ofMonths(12),
      startDate: START_DATE,
    };

    const { getByText } = render(<SystemComparisonChart baseRequest={baseRequest} />);

    expect(getByText(/mismo monto, tasa y plazo/i)).toBeInTheDocument();
    // El sistema alemán amortiza capital constante desde el inicio, por lo que
    // siempre paga menos interés total que el francés a igualdad de condiciones.
    expect(getByText(/el sistema alemán te ahorraría/i)).toBeInTheDocument();
  });
});
