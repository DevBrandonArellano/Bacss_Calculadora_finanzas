import Decimal from 'decimal.js';
import { addMonths } from 'date-fns';
import { Money } from '../shared/money';
import { distributeAdjustment } from '../shared/roundingPolicy';
import type { AmortizationSystem, AmortizationInput } from './amortizationSystem';
import type { AmortizationRow } from './amortizationRow';

interface RawPeriod {
  readonly interest: Money;
}

/**
 * Sistema de amortización alemán: capital constante (P/n), interés sobre saldo
 * decreciente, cuota decreciente. Sin caso especial para tasa 0% (a diferencia
 * del francés): con capital constante, tasa 0% simplemente da interés 0 en todas
 * las filas, sin indeterminación matemática. La última fila absorbe el ajuste de
 * redondeo acumulado (RoundingPolicy.distributeAdjustment) para que el saldo
 * final cierre exactamente en 0.
 */
export class GermanAmortization implements AmortizationSystem {
  generate(input: AmortizationInput): readonly AmortizationRow[] {
    const { principal, monthlyRate, term, startDate } = input;
    const periods = term.toMonths();

    const constantCapital = this.calculateConstantCapital(principal, periods);
    const rawPeriods = this.buildRawPeriods(principal, monthlyRate, periods);
    const adjustedCapital = distributeAdjustment(
      Array.from({ length: periods }, () => constantCapital),
      principal,
    );

    return this.buildRows(rawPeriods, adjustedCapital, principal, startDate);
  }

  private calculateConstantCapital(principal: Money, periods: number): Money {
    const raw = principal.toDecimal().dividedBy(periods);
    return Money.of(raw, principal.currency).round();
  }

  private buildRawPeriods(principal: Money, monthlyRate: Decimal, periods: number): RawPeriod[] {
    const constantCapital = this.calculateConstantCapital(principal, periods);
    const rawPeriods: RawPeriod[] = [];
    let balance = principal;

    for (let period = 1; period <= periods; period++) {
      const interest = balance.multiply(monthlyRate).round();
      balance = balance.subtract(constantCapital);
      rawPeriods.push({ interest });
    }

    return rawPeriods;
  }

  private buildRows(
    rawPeriods: readonly RawPeriod[],
    adjustedCapital: readonly Money[],
    principal: Money,
    startDate: Date,
  ): AmortizationRow[] {
    const rows: AmortizationRow[] = [];
    let balance = principal;

    for (let index = 0; index < rawPeriods.length; index++) {
      const periodNumber = index + 1;
      // Invariante: adjustedCapital se deriva de distributeAdjustment sobre un array
      // de longitud rawPeriods.length, por construcción tiene la misma longitud.
      const rawPeriod = rawPeriods[index] as RawPeriod;
      const principalPaid = adjustedCapital[index] as Money;

      balance = balance.subtract(principalPaid);

      rows.push({
        periodNumber,
        date: addMonths(startDate, periodNumber),
        installment: principalPaid.add(rawPeriod.interest),
        interest: rawPeriod.interest,
        principalPaid,
        remainingBalance: balance,
      });
    }

    return rows;
  }
}
