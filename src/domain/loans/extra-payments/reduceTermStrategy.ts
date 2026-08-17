import { Term } from '../../shared/term';
import type { ExtraPaymentStrategy, NextSegmentParams } from './extraPaymentStrategy';

// Fecha fija usada únicamente para sondear la cuota de la primera fila durante
// la búsqueda binaria — irrelevante porque solo se lee `installment`, no `date`.
const PROBE_DATE = new Date('2000-01-01T00:00:00.000Z');

/**
 * Busca el menor plazo n' tal que la cuota/capital del primer periodo del nuevo
 * tramo no exceda la cuota que se venía pagando (referenceInstallment). Válido
 * por monotonía: installment(n) decrece con n en ambos sistemas (francés y alemán).
 * Deliberadamente agnóstica al sistema: solo compara el installment de la primera
 * fila que cada sistema expone igual.
 */
export class ReduceTermStrategy implements ExtraPaymentStrategy {
  readonly name = 'reduce-term' as const;

  computeNextTermMonths(params: NextSegmentParams): number {
    const { system, newPrincipal, monthlyRate, referenceInstallment, remainingOriginalPeriods } =
      params;

    let low = 1;
    let high = remainingOriginalPeriods;

    while (low < high) {
      const mid = Math.floor((low + high) / 2);
      const firstRow = system.generate({
        principal: newPrincipal,
        monthlyRate,
        term: Term.ofMonths(mid),
        startDate: PROBE_DATE,
      })[0];

      if (firstRow?.installment.lessThanOrEqual(referenceInstallment) === true) {
        high = mid;
      } else {
        low = mid + 1;
      }
    }

    return low;
  }
}
