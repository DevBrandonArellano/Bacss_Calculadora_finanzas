import { describe, it, expect, beforeEach } from 'vitest';
import { useLoanStore, setLoanStoreLogger } from './loanStore';
import type { Logger, LogEntry } from '../../application/ports/logger';

class FakeLogger implements Logger {
  readonly entries: Omit<LogEntry, 'timestamp'>[] = [];
  log(entry: Omit<LogEntry, 'timestamp'>): void {
    this.entries.push(entry);
  }
}

describe('useLoanStore', () => {
  beforeEach(() => {
    useLoanStore.getState().reset();
  });

  it('debe usar un logger inyectado vía setLoanStoreLogger', () => {
    const logger = new FakeLogger();
    setLoanStoreLogger(logger);

    useLoanStore.getState().updateForm({
      principal: '0',
      annualRatePercent: '12',
      termValue: '12',
      rateConversionMethod: 'nominal',
    });
    useLoanStore.getState().calculate();

    expect(logger.entries.length).toBeGreaterThan(0);
  });

  it('debe mostrar error cuando no se selecciona método de conversión de tasa', () => {
    useLoanStore.getState().updateForm({
      principal: '10000',
      annualRatePercent: '12',
      termValue: '12',
      rateConversionMethod: '',
    });
    useLoanStore.getState().calculate();

    expect(useLoanStore.getState().error).toContain('método de conversión');
  });

  it('debe calcular correctamente con el sistema alemán y plazo en años', () => {
    useLoanStore.getState().updateForm({
      principal: '10000',
      annualRatePercent: '12',
      termValue: '1',
      termUnit: 'years',
      system: 'german',
      rateConversionMethod: 'nominal',
    });
    useLoanStore.getState().calculate();

    const result = useLoanStore.getState().result;
    expect(result?.kind).toBe('simple');
    expect(result?.kind === 'simple' ? result.data.summary.termInMonths : null).toBe(12);
    expect(useLoanStore.getState().error).toBeNull();
  });

  it('debe traducir OutOfRangeError con mensaje "fuera de rango"', () => {
    useLoanStore.getState().updateForm({
      principal: '10000',
      annualRatePercent: '150', // excede InterestRate.MAX_ANNUAL_RATE (100%)
      termValue: '12',
      rateConversionMethod: 'nominal',
    });
    useLoanStore.getState().calculate();

    expect(useLoanStore.getState().error).toContain('fuera de rango');
  });

  it('reset debe restaurar el formulario, resultado y error a sus valores iniciales', () => {
    useLoanStore.getState().updateForm({ principal: '5000' });
    useLoanStore.getState().reset();

    expect(useLoanStore.getState().form.principal).toBe('');
    expect(useLoanStore.getState().result).toBeNull();
    expect(useLoanStore.getState().error).toBeNull();
  });

  it('debe parsear costos opcionales a Money al calcular', () => {
    useLoanStore.getState().updateForm({
      principal: '10000',
      annualRatePercent: '12',
      termValue: '12',
      rateConversionMethod: 'nominal',
      optionalCosts: '250',
    });
    useLoanStore.getState().calculate();

    expect(useLoanStore.getState().optionalCosts.toFixed(2)).toBe('250.00');
  });

  it('optionalCosts debe ser cero por defecto cuando no se ingresa', () => {
    useLoanStore.getState().updateForm({
      principal: '10000',
      annualRatePercent: '12',
      termValue: '12',
      rateConversionMethod: 'nominal',
    });
    useLoanStore.getState().calculate();

    expect(useLoanStore.getState().optionalCosts.isZero()).toBe(true);
  });

  it('addExtraPaymentRow debe agregar una fila vacía de abono', () => {
    useLoanStore.getState().addExtraPaymentRow();

    expect(useLoanStore.getState().form.extraPayments).toHaveLength(1);
    expect(useLoanStore.getState().form.extraPayments[0]).toMatchObject({
      periodNumber: '',
      amount: '',
    });
  });

  it('removeExtraPaymentRow debe quitar la fila indicada', () => {
    useLoanStore.getState().addExtraPaymentRow();
    const id = useLoanStore.getState().form.extraPayments[0]?.id;

    useLoanStore.getState().removeExtraPaymentRow(id as string);

    expect(useLoanStore.getState().form.extraPayments).toHaveLength(0);
  });

  it('updateExtraPaymentRow debe actualizar los campos de la fila indicada', () => {
    useLoanStore.getState().addExtraPaymentRow();
    const id = useLoanStore.getState().form.extraPayments[0]?.id as string;

    useLoanStore.getState().updateExtraPaymentRow(id, { periodNumber: '3', amount: '2000' });

    expect(useLoanStore.getState().form.extraPayments[0]).toMatchObject({
      periodNumber: '3',
      amount: '2000',
    });
  });

  it('calculate debe usar simulateExtraPayments cuando hay abonos válidos y devolver kind withExtraPayments', () => {
    useLoanStore.getState().updateForm({
      principal: '10000',
      annualRatePercent: '12',
      termValue: '12',
      rateConversionMethod: 'nominal',
      strategy: 'reduce-payment',
    });
    useLoanStore.getState().addExtraPaymentRow();
    const id = useLoanStore.getState().form.extraPayments[0]?.id as string;
    useLoanStore.getState().updateExtraPaymentRow(id, { periodNumber: '3', amount: '2000' });

    useLoanStore.getState().calculate();

    const result = useLoanStore.getState().result;
    expect(result?.kind).toBe('withExtraPayments');
    expect(
      result?.kind === 'withExtraPayments' ? result.data.interestSaved.isPositive() : false,
    ).toBe(true);
    expect(useLoanStore.getState().error).toBeNull();
  });

  it('calculate debe exponer baseRequest con los parámetros base del préstamo', () => {
    useLoanStore.getState().updateForm({
      principal: '10000',
      annualRatePercent: '12',
      termValue: '12',
      rateConversionMethod: 'nominal',
    });

    useLoanStore.getState().calculate();

    const baseRequest = useLoanStore.getState().baseRequest;
    expect(baseRequest?.principal.toFixed(2)).toBe('10000.00');
    expect(baseRequest?.term.toMonths()).toBe(12);
  });

  it('baseRequest debe ser null tras reset', () => {
    useLoanStore.getState().updateForm({
      principal: '10000',
      annualRatePercent: '12',
      termValue: '12',
      rateConversionMethod: 'nominal',
    });
    useLoanStore.getState().calculate();

    useLoanStore.getState().reset();

    expect(useLoanStore.getState().baseRequest).toBeNull();
  });

  it('addRecurringContributionRow debe agregar una fila vacía de aporte recurrente', () => {
    useLoanStore.getState().addRecurringContributionRow();

    expect(useLoanStore.getState().form.recurringContributions).toHaveLength(1);
    expect(useLoanStore.getState().form.recurringContributions[0]).toMatchObject({
      amount: '',
      startPeriod: '',
      endPeriod: '',
    });
  });

  it('removeRecurringContributionRow debe quitar la fila indicada', () => {
    useLoanStore.getState().addRecurringContributionRow();
    const id = useLoanStore.getState().form.recurringContributions[0]?.id as string;

    useLoanStore.getState().removeRecurringContributionRow(id);

    expect(useLoanStore.getState().form.recurringContributions).toHaveLength(0);
  });

  it('updateRecurringContributionRow debe actualizar los campos de la fila indicada', () => {
    useLoanStore.getState().addRecurringContributionRow();
    const id = useLoanStore.getState().form.recurringContributions[0]?.id as string;

    useLoanStore
      .getState()
      .updateRecurringContributionRow(id, { amount: '500', startPeriod: '1', endPeriod: '6' });

    expect(useLoanStore.getState().form.recurringContributions[0]).toMatchObject({
      amount: '500',
      startPeriod: '1',
      endPeriod: '6',
    });
  });

  it('calculate debe usar simulateExtraPayments cuando hay un aporte recurrente válido (sin abonos únicos)', () => {
    useLoanStore.getState().updateForm({
      principal: '10000',
      annualRatePercent: '12',
      termValue: '12',
      rateConversionMethod: 'nominal',
      strategy: 'reduce-payment',
    });
    useLoanStore.getState().addRecurringContributionRow();
    const id = useLoanStore.getState().form.recurringContributions[0]?.id as string;
    useLoanStore
      .getState()
      .updateRecurringContributionRow(id, { amount: '500', startPeriod: '1', endPeriod: '6' });

    useLoanStore.getState().calculate();

    const result = useLoanStore.getState().result;
    expect(result?.kind).toBe('withExtraPayments');
    expect(
      result?.kind === 'withExtraPayments' ? result.data.interestSaved.isPositive() : false,
    ).toBe(true);
    expect(useLoanStore.getState().error).toBeNull();
  });

  it('calculate debe traducir el error cuando el aporte recurrente está fuera de rango', () => {
    useLoanStore.getState().updateForm({
      principal: '10000',
      annualRatePercent: '12',
      termValue: '12',
      rateConversionMethod: 'nominal',
    });
    useLoanStore.getState().addRecurringContributionRow();
    const id = useLoanStore.getState().form.recurringContributions[0]?.id as string;
    useLoanStore
      .getState()
      .updateRecurringContributionRow(id, { amount: '500', startPeriod: '1', endPeriod: '99' });

    useLoanStore.getState().calculate();

    expect(useLoanStore.getState().result).toBeNull();
    expect(useLoanStore.getState().error).toContain('Valor inválido');
  });

  it('calculate debe traducir el error cuando el periodo del abono está fuera de rango', () => {
    useLoanStore.getState().updateForm({
      principal: '10000',
      annualRatePercent: '12',
      termValue: '12',
      rateConversionMethod: 'nominal',
    });
    useLoanStore.getState().addExtraPaymentRow();
    const id = useLoanStore.getState().form.extraPayments[0]?.id as string;
    useLoanStore.getState().updateExtraPaymentRow(id, { periodNumber: '99', amount: '2000' });

    useLoanStore.getState().calculate();

    expect(useLoanStore.getState().result).toBeNull();
    expect(useLoanStore.getState().error).toContain('Valor inválido');
  });

  it('calculate debe exponer extraPaymentInputs con los abonos y aportes parseados cuando hay abonos', () => {
    useLoanStore.getState().updateForm({
      principal: '10000',
      annualRatePercent: '12',
      termValue: '12',
      rateConversionMethod: 'nominal',
    });
    useLoanStore.getState().addExtraPaymentRow();
    const id = useLoanStore.getState().form.extraPayments[0]?.id as string;
    useLoanStore.getState().updateExtraPaymentRow(id, { periodNumber: '3', amount: '2000' });

    useLoanStore.getState().calculate();

    const inputs = useLoanStore.getState().extraPaymentInputs;
    expect(inputs?.extraPayments).toHaveLength(1);
    expect(inputs?.extraPayments[0]?.periodNumber).toBe(3);
    expect(inputs?.recurringContributions).toHaveLength(0);
  });

  it('extraPaymentInputs debe ser null cuando el resultado es simple (sin abonos)', () => {
    useLoanStore.getState().updateForm({
      principal: '10000',
      annualRatePercent: '12',
      termValue: '12',
      rateConversionMethod: 'nominal',
    });

    useLoanStore.getState().calculate();

    expect(useLoanStore.getState().extraPaymentInputs).toBeNull();
  });

  it('extraPaymentInputs debe ser null tras reset', () => {
    useLoanStore.getState().updateForm({
      principal: '10000',
      annualRatePercent: '12',
      termValue: '12',
      rateConversionMethod: 'nominal',
    });
    useLoanStore.getState().addExtraPaymentRow();
    const id = useLoanStore.getState().form.extraPayments[0]?.id as string;
    useLoanStore.getState().updateExtraPaymentRow(id, { periodNumber: '3', amount: '2000' });
    useLoanStore.getState().calculate();

    useLoanStore.getState().reset();

    expect(useLoanStore.getState().extraPaymentInputs).toBeNull();
  });
});
