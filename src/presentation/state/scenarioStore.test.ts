import { describe, it, expect, beforeEach } from 'vitest';
import { useScenarioStore, setScenarioStoreLogger } from './scenarioStore';
import type { Logger, LogEntry } from '../../application/ports/logger';

class FakeLogger implements Logger {
  readonly entries: Omit<LogEntry, 'timestamp'>[] = [];
  log(entry: Omit<LogEntry, 'timestamp'>): void {
    this.entries.push(entry);
  }
}

function fillRow(
  id: string,
  overrides: Partial<{ principal: string; annualRatePercent: string; termValue: string }> = {},
) {
  useScenarioStore.getState().updateRow(id, {
    principal: overrides.principal ?? '10000',
    annualRatePercent: overrides.annualRatePercent ?? '12',
    termValue: overrides.termValue ?? '12',
    rateConversionMethod: 'nominal',
  });
}

describe('useScenarioStore', () => {
  beforeEach(() => {
    useScenarioStore.getState().reset();
  });

  it('debe iniciar sin filas', () => {
    expect(useScenarioStore.getState().rows).toHaveLength(0);
  });

  it('addRow debe agregar una fila con etiqueta autogenerada (A, B, C...)', () => {
    useScenarioStore.getState().addRow();
    useScenarioStore.getState().addRow();

    const rows = useScenarioStore.getState().rows;
    expect(rows).toHaveLength(2);
    expect(rows[0]?.label).toBe('Escenario A');
    expect(rows[1]?.label).toBe('Escenario B');
  });

  it('removeRow debe quitar la fila indicada', () => {
    useScenarioStore.getState().addRow();
    const id = useScenarioStore.getState().rows[0]?.id as string;

    useScenarioStore.getState().removeRow(id);

    expect(useScenarioStore.getState().rows).toHaveLength(0);
  });

  it('updateRow debe actualizar los campos de la fila indicada', () => {
    useScenarioStore.getState().addRow();
    const id = useScenarioStore.getState().rows[0]?.id as string;

    useScenarioStore.getState().updateRow(id, { principal: '5000' });

    expect(useScenarioStore.getState().rows[0]).toMatchObject({ principal: '5000' });
  });

  it('compare debe requerir al menos un escenario', () => {
    useScenarioStore.getState().compare();

    expect(useScenarioStore.getState().error).toContain('al menos un escenario');
    expect(useScenarioStore.getState().comparison).toBeNull();
  });

  it('compare debe generar la tabla comparativa cuando hay escenarios válidos', () => {
    useScenarioStore.getState().addRow();
    useScenarioStore.getState().addRow();
    const rows = useScenarioStore.getState().rows;
    fillRow(rows[0]?.id as string, { termValue: '12' });
    fillRow(rows[1]?.id as string, { termValue: '24' });

    useScenarioStore.getState().compare();

    const comparison = useScenarioStore.getState().comparison;
    expect(comparison?.rows).toHaveLength(2);
    expect(comparison?.rows[0]?.label).toBe('Escenario A');
    expect(useScenarioStore.getState().error).toBeNull();
  });

  it('compare debe traducir el error cuando falta el método de conversión de tasa', () => {
    useScenarioStore.getState().addRow();
    const id = useScenarioStore.getState().rows[0]?.id as string;
    useScenarioStore
      .getState()
      .updateRow(id, { principal: '10000', annualRatePercent: '12', termValue: '12' });

    useScenarioStore.getState().compare();

    expect(useScenarioStore.getState().error).toContain('método de conversión');
  });

  it('compare debe usar un logger inyectado vía setScenarioStoreLogger cuando hay un error de dominio', () => {
    const logger = new FakeLogger();
    setScenarioStoreLogger(logger);

    useScenarioStore.getState().addRow();
    const id = useScenarioStore.getState().rows[0]?.id as string;
    useScenarioStore.getState().updateRow(id, {
      principal: '0',
      annualRatePercent: '12',
      termValue: '12',
      rateConversionMethod: 'nominal',
    });

    useScenarioStore.getState().compare();

    expect(logger.entries.length).toBeGreaterThan(0);
  });

  it('reset debe limpiar filas, comparación y error', () => {
    useScenarioStore.getState().addRow();
    useScenarioStore.getState().compare();

    useScenarioStore.getState().reset();

    expect(useScenarioStore.getState().rows).toHaveLength(0);
    expect(useScenarioStore.getState().comparison).toBeNull();
    expect(useScenarioStore.getState().error).toBeNull();
  });
});
