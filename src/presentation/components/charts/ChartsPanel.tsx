import { lazy, Suspense } from 'react';
import type { AmortizationRequest } from '../../../domain/loans/amortizationEngine';
import type { ExtraPaymentInputs, LoanResult } from '../../state/loanStore';

// Recharts (~110 kB gzip) es el 58 % del JS inicial de la app y no se necesita
// hasta que hay un resultado que graficar. Cargarlo aquí, y no en el árbol
// estático, deja esos kilobytes fuera del primer render.
const ChartsGrid = lazy(() => import('./ChartsGrid'));

export interface ChartsPanelProps {
  readonly result: LoanResult | null;
  readonly baseRequest: AmortizationRequest | null;
  readonly extraPaymentInputs: ExtraPaymentInputs | null;
}

export function ChartsPanel({ result, baseRequest, extraPaymentInputs }: ChartsPanelProps) {
  if (result === null) {
    return (
      <p className="text-sm text-gray-500 p-4">
        Completa el formulario y presiona &quot;Calcular&quot; para ver los gráficos.
      </p>
    );
  }

  return (
    <Suspense
      fallback={
        <p role="status" className="text-sm text-gray-500 p-4">
          Cargando gráficos…
        </p>
      }
    >
      <ChartsGrid
        result={result}
        baseRequest={baseRequest}
        extraPaymentInputs={extraPaymentInputs}
      />
    </Suspense>
  );
}

export default ChartsPanel;
