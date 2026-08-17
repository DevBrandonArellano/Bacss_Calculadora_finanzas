import Decimal from 'decimal.js';
import { addMonths } from 'date-fns';
import { Money } from '../shared/money';
import { distributeAdjustment } from '../shared/roundingPolicy';
import type { AmortizationSystem, AmortizationInput } from './amortizationSystem';
import type { AmortizationRow } from './amortizationRow';

interface RawPeriod {
  readonly interest: Money;
  readonly principalPaid: Money;
}

/**
 * Sistema de amortización francés: cuota constante, desglose interés/capital
 * decreciente en interés y creciente en capital. La última cuota puede diferir
 * en 1-2 céntimos de las demás — absorbe el ajuste de redondeo acumulado para
 * que el saldo final cierre exactamente en 0 (RoundingPolicy.distributeAdjustment).
 */
export class FrenchAmortization implements AmortizationSystem {
  generate(input: AmortizationInput): readonly AmortizationRow[] {
    const { principal, monthlyRate, term, startDate } = input;
    const periods = term.toMonths();

    const installment = this.calculateInstallment(principal, monthlyRate, periods);
    const rawPeriods = this.buildRawPeriods(principal, monthlyRate, installment, periods);
    const adjustedCapital = distributeAdjustment(
      rawPeriods.map((p) => p.principalPaid),
      principal,
    );

    return this.buildRows(rawPeriods, adjustedCapital, installment, principal, startDate);
  }

  private calculateInstallment(principal: Money, monthlyRate: Decimal, periods: number): Money {
    if (monthlyRate.isZero()) {
      const raw = principal.toDecimal().dividedBy(periods);
      return Money.of(raw, principal.currency).round();
    }

    const onePlusRate = monthlyRate.plus(1);
    const denominator = new Decimal(1).minus(onePlusRate.pow(-periods));
    const raw = principal.toDecimal().times(monthlyRate).dividedBy(denominator);
    return Money.of(raw, principal.currency).round();
  }

  private buildRawPeriods(
    principal: Money,
    monthlyRate: Decimal,
    installment: Money,
    periods: number,
  ): RawPeriod[] {
    const rawPeriods: RawPeriod[] = [];
    let balance = principal;

    for (let period = 1; period <= periods; period++) {
      const interest = balance.multiply(monthlyRate).round();
      const principalPaid = installment.subtract(interest);
      balance = balance.subtract(principalPaid);
      rawPeriods.push({ interest, principalPaid });
    }

    return rawPeriods;
  }

  private buildRows(
    rawPeriods: readonly RawPeriod[],
    adjustedCapital: readonly Money[],
    installment: Money,
    principal: Money,
    startDate: Date,
  ): AmortizationRow[] {
    const rows: AmortizationRow[] = [];
    let balance = principal;

    // Invariante: adjustedCapital se deriva de distributeAdjustment(rawPeriods.map(...), principal),
    // por construcción tiene exactamente rawPeriods.length elementos — el cast documenta esa garantía
    // sin introducir una rama defensiva inalcanzable en el hot path del loop.
    for (let index = 0; index < rawPeriods.length; index++) {
      const periodNumber = index + 1;
      const rawPeriod = rawPeriods[index] as RawPeriod;
      const principalPaid = adjustedCapital[index] as Money;

      const isLastPeriod = periodNumber === rawPeriods.length;
      const rowInstallment = isLastPeriod ? principalPaid.add(rawPeriod.interest) : installment;
      balance = balance.subtract(principalPaid);

      rows.push({
        periodNumber,
        date: addMonths(startDate, periodNumber),
        installment: rowInstallment,
        interest: rawPeriod.interest,
        principalPaid,
        remainingBalance: balance,
      });
    }

    return rows;
  }
}
