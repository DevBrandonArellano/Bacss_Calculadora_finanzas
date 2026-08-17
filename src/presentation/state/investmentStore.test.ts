import { describe, it, expect, beforeEach } from 'vitest';
import { useInvestmentStore, setInvestmentStoreLogger } from './investmentStore';
import type { Logger, LogEntry } from '../../application/ports/logger';

class FakeLogger implements Logger {
  readonly entries: Omit<LogEntry, 'timestamp'>[] = [];
  log(entry: Omit<LogEntry, 'timestamp'>): void {
    this.entries.push(entry);
  }
}

function fillValidForm() {
  useInvestmentStore.getState().updateForm({
    availableAmount: '5000',
    loanPrincipal: '10000',
    loanAnnualRatePercent: '12',
    loanTermValue: '12',
    rateConversionMethod: 'nominal',
    expectedReturnPercent: '10',
    monthlyContribution: '100',
    taxRatePercent: '0',
  });
}

describe('useInvestmentStore', () => {
  beforeEach(() => {
    useInvestmentStore.getState().reset();
  });

  it('compare debe requerir el método de conversión de tasa', () => {
    useInvestmentStore.getState().updateForm({
      availableAmount: '5000',
      loanPrincipal: '10000',
      loanAnnualRatePercent: '12',
      loanTermValue: '12',
      expectedReturnPercent: '10',
    });

    useInvestmentStore.getState().compare();

    expect(useInvestmentStore.getState().error).toContain('método de conversión');
    expect(useInvestmentStore.getState().result).toBeNull();
  });

  it('compare debe generar un resultado con recomendación y disclaimer cuando los datos son válidos', () => {
    fillValidForm();

    useInvestmentStore.getState().compare();

    const result = useInvestmentStore.getState().result;
    expect(result).not.toBeNull();
    expect(['pay-debt', 'invest', 'equivalent']).toContain(result?.recommendation);
    expect(result?.disclaimer.length).toBeGreaterThan(0);
    expect(useInvestmentStore.getState().error).toBeNull();
  });

  it('compare debe traducir el error de dominio y loguearlo cuando el principal del préstamo es inválido', () => {
    const logger = new FakeLogger();
    setInvestmentStoreLogger(logger);

    fillValidForm();
    useInvestmentStore.getState().updateForm({ loanPrincipal: '0' });

    useInvestmentStore.getState().compare();

    expect(useInvestmentStore.getState().error).not.toBeNull();
    expect(logger.entries.length).toBeGreaterThan(0);
  });

  it('reset debe restaurar el formulario, resultado y error a sus valores iniciales', () => {
    fillValidForm();
    useInvestmentStore.getState().compare();

    useInvestmentStore.getState().reset();

    expect(useInvestmentStore.getState().form.availableAmount).toBe('');
    expect(useInvestmentStore.getState().result).toBeNull();
    expect(useInvestmentStore.getState().error).toBeNull();
  });
});
