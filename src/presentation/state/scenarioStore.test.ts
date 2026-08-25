import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useScenarioStore, setScenarioStoreLogger, setScenarioStoreRepository } from './scenarioStore';
import type { Logger, LogEntry } from '../../application/ports/logger';
import type { ScenarioRepository } from '../../application/ports/scenarioRepository';

class FakeLogger implements Logger {
  readonly entries: Omit<LogEntry, 'timestamp'>[] = [];
  log(entry: Omit<LogEntry, 'timestamp'>): void {
    this.entries.push(entry);
  }
}

function fakeRepository(overrides: Partial<ScenarioRepository> = {}): ScenarioRepository {
  return {
    save: vi.fn().mockResolvedValue(undefined),
    findById: vi.fn().mockResolvedValue(null),
    findAll: vi.fn().mockResolvedValue([]),
    remove: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
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

describe('useScenarioStore — persistencia de comparaciones guardadas', () => {
  beforeEach(() => {
    useScenarioStore.getState().reset();
    setScenarioStoreRepository(fakeRepository());
  });

  it('saveCurrentComparison guarda un snapshot de las filas actuales vía el repositorio', async () => {
    const save = vi.fn<(id: string, scenario: unknown) => Promise<void>>().mockResolvedValue(undefined);
    setScenarioStoreRepository(fakeRepository({ save }));
    useScenarioStore.getState().addRow();

    await useScenarioStore.getState().saveCurrentComparison('Mi comparación');

    expect(save).toHaveBeenCalledTimes(1);
    const [, snapshot] = save.mock.calls[0] as [string, { label: string; rows: unknown[] }];
    expect(snapshot.label).toBe('Mi comparación');
    expect(snapshot.rows).toHaveLength(1);
  });

  it('saveCurrentComparison refresca savedComparisons tras guardar', async () => {
    const saved = { id: 's1', label: 'Mi comparación', savedAt: '2026-01-01T00:00:00Z', rows: [] };
    const repository = fakeRepository({ findAll: vi.fn().mockResolvedValue([saved]) });
    setScenarioStoreRepository(repository);

    await useScenarioStore.getState().saveCurrentComparison('Mi comparación');

    expect(useScenarioStore.getState().savedComparisons).toEqual([saved]);
  });

  it('loadSavedComparisons puebla savedComparisons desde el repositorio', async () => {
    const saved = { id: 's1', label: 'Guardada', savedAt: '2026-01-01T00:00:00Z', rows: [] };
    setScenarioStoreRepository(fakeRepository({ findAll: vi.fn().mockResolvedValue([saved]) }));

    await useScenarioStore.getState().loadSavedComparisons();

    expect(useScenarioStore.getState().savedComparisons).toEqual([saved]);
  });

  it('loadSavedComparison reemplaza las filas actuales con las de la comparación guardada', async () => {
    const savedRow = {
      id: 'row-1',
      label: 'Escenario A',
      principal: '5000',
      annualRatePercent: '10',
      termValue: '24',
      termUnit: 'months' as const,
      system: 'french' as const,
      rateConversionMethod: 'nominal' as const,
      startDate: '2026-01-01',
    };
    const saved = { id: 's1', label: 'Guardada', savedAt: '2026-01-01T00:00:00Z', rows: [savedRow] };
    setScenarioStoreRepository(fakeRepository({ findAll: vi.fn().mockResolvedValue([saved]) }));
    await useScenarioStore.getState().loadSavedComparisons();

    useScenarioStore.getState().loadSavedComparison('s1');

    expect(useScenarioStore.getState().rows).toEqual([savedRow]);
  });

  it('deleteSavedComparison elimina vía el repositorio y refresca la lista', async () => {
    const remove = vi.fn().mockResolvedValue(undefined);
    setScenarioStoreRepository(
      fakeRepository({ remove, findAll: vi.fn().mockResolvedValue([]) }),
    );

    await useScenarioStore.getState().deleteSavedComparison('s1');

    expect(remove).toHaveBeenCalledWith('s1');
    expect(useScenarioStore.getState().savedComparisons).toEqual([]);
  });

  it('saveCurrentComparison nunca lanza aunque el repositorio falle, y expone un error legible', async () => {
    setScenarioStoreRepository(
      fakeRepository({ save: vi.fn().mockRejectedValue(new Error('cuota excedida')) }),
    );
    useScenarioStore.getState().addRow();

    await expect(useScenarioStore.getState().saveCurrentComparison('X')).resolves.toBeUndefined();
    expect(useScenarioStore.getState().persistenceError).not.toBeNull();
  });
});
