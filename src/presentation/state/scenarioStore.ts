import { create } from 'zustand';
import { compareScenarios } from '../../application/use-cases/compareScenarios';
import { Money } from '../../domain/shared/money';
import { InterestRate } from '../../domain/shared/interestRate';
import { Term } from '../../domain/shared/term';
import { FrenchAmortization } from '../../domain/loans/frenchAmortization';
import { GermanAmortization } from '../../domain/loans/germanAmortization';
import { DomainError } from '../../domain/shared/errors';
import { translateDomainError } from './translateDomainError';
import type { AmortizationSystemName, TermUnit } from './loanStore';
import type { Scenario } from '../../domain/investments/scenario';
import type { ScenarioComparisonResult } from '../../domain/investments/scenarioComparator';
import type { MonthlyConversionMethod } from '../../domain/shared/interestRate';
import type { Logger } from '../../application/ports/logger';
import type { ScenarioRepository } from '../../application/ports/scenarioRepository';

class NoOpLogger implements Logger {
  log(): void {
    // sin operación por defecto
  }
}

let activeLogger: Logger = new NoOpLogger();

export function setScenarioStoreLogger(logger: Logger): void {
  activeLogger = logger;
}

class NoOpScenarioRepository implements ScenarioRepository {
  save(): Promise<void> {
    return Promise.resolve();
  }
  findById(): Promise<unknown> {
    return Promise.resolve(null);
  }
  findAll(): Promise<readonly unknown[]> {
    return Promise.resolve([]);
  }
  remove(): Promise<void> {
    return Promise.resolve();
  }
}

/** Repositorio para guardar/cargar comparaciones completas (fila A/B/C/D).
 * Patrón de registro igual al del logger: `presentation` no importa
 * `infrastructure` directamente (ADR 0001); el composition root (`main.tsx`)
 * inyecta la implementación real (local, Supabase, o ambas vía
 * `ReliableScenarioRepository`). */
let activeRepository: ScenarioRepository = new NoOpScenarioRepository();

export function setScenarioStoreRepository(repository: ScenarioRepository): void {
  activeRepository = repository;
}

export interface SavedComparison {
  readonly id: string;
  readonly label: string;
  readonly savedAt: string;
  readonly rows: readonly ScenarioRowState[];
}

function isSavedComparison(value: unknown): value is SavedComparison {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'label' in value &&
    'rows' in value
  );
}

export interface ScenarioRowState {
  readonly id: string;
  readonly label: string;
  readonly principal: string;
  readonly annualRatePercent: string;
  readonly termValue: string;
  readonly termUnit: TermUnit;
  readonly system: AmortizationSystemName;
  readonly rateConversionMethod: MonthlyConversionMethod | '';
  readonly startDate: string;
}

export type ScenarioPersistenceStatus = 'idle' | 'saving' | 'loading' | 'error';

/**
 * Estado de sincronización remota, deliberadamente separado de
 * `persistenceStatus`: lo escribe solo el callback `onSyncStatusChange` de
 * `ReliableScenarioRepository` (inyectado en `main.tsx`), nunca las acciones
 * del store. `ReliableScenarioRepository` nunca lanza — "la llamada no
 * lanzó" no implica "se sincronizó con el servidor" — así que mezclar ambos
 * en un solo campo hacía que el resultado de `loadSavedComparisons` pisara el
 * estado real de sincronización reportado durante el propio `save`.
 */
export type ScenarioSyncStatus = 'unknown' | 'synced' | 'offline';

export interface ScenarioStoreState {
  readonly rows: readonly ScenarioRowState[];
  readonly comparison: ScenarioComparisonResult | null;
  readonly error: string | null;
  readonly savedComparisons: readonly SavedComparison[];
  readonly persistenceStatus: ScenarioPersistenceStatus;
  readonly persistenceError: string | null;
  readonly syncStatus: ScenarioSyncStatus;
  addRow: () => void;
  removeRow: (id: string) => void;
  updateRow: (id: string, patch: Partial<Omit<ScenarioRowState, 'id' | 'label'>>) => void;
  compare: () => void;
  reset: () => void;
  saveCurrentComparison: (label: string) => Promise<void>;
  loadSavedComparisons: () => Promise<void>;
  loadSavedComparison: (id: string) => void;
  deleteSavedComparison: (id: string) => Promise<void>;
}

function labelForIndex(index: number): string {
  return `Escenario ${String.fromCharCode(65 + index)}`;
}

function newRow(index: number): ScenarioRowState {
  return {
    id: crypto.randomUUID(),
    label: labelForIndex(index),
    principal: '',
    annualRatePercent: '',
    termValue: '',
    termUnit: 'months',
    system: 'french',
    rateConversionMethod: '',
    startDate: new Date().toISOString().slice(0, 10),
  };
}

export const useScenarioStore = create<ScenarioStoreState>((set, get) => ({
  rows: [],
  comparison: null,
  error: null,
  savedComparisons: [],
  persistenceStatus: 'idle',
  persistenceError: null,
  syncStatus: 'unknown',

  addRow: () => {
    set((state) => ({ rows: [...state.rows, newRow(state.rows.length)] }));
  },

  removeRow: (id) => {
    set((state) => ({
      rows: state.rows
        .filter((row) => row.id !== id)
        .map((row, index) => ({ ...row, label: labelForIndex(index) })),
    }));
  },

  updateRow: (id, patch) => {
    set((state) => ({
      rows: state.rows.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    }));
  },

  compare: () => {
    const { rows } = get();

    try {
      if (rows.length === 0) {
        throw new Error('Agrega al menos un escenario para comparar.');
      }

      const scenarios: Scenario[] = rows.map((row) => {
        if (row.rateConversionMethod === '') {
          throw new Error(
            `Selecciona el método de conversión de tasa para "${row.label}" (nominal o efectiva).`,
          );
        }

        const principal = Money.ofNonNegative(row.principal || '0', 'USD');
        const annualRate = InterestRate.fromPercentage(row.annualRatePercent || '0');
        const termValue = Number(row.termValue || '0');
        const term = row.termUnit === 'years' ? Term.ofYears(termValue) : Term.ofMonths(termValue);
        const system =
          row.system === 'french' ? new FrenchAmortization() : new GermanAmortization();
        const startDate = new Date(`${row.startDate}T00:00:00.000Z`);

        return {
          label: row.label,
          request: {
            system,
            principal,
            annualRate,
            rateConversionMethod: row.rateConversionMethod,
            term,
            startDate,
          },
        };
      });

      const comparison = compareScenarios(scenarios, activeLogger);
      set({ comparison, error: null });
    } catch (error) {
      const message =
        error instanceof DomainError
          ? translateDomainError(error)
          : error instanceof Error
            ? error.message
            : 'Ocurrió un error inesperado al comparar los escenarios.';
      set({ comparison: null, error: message });
    }
  },

  reset: () => {
    set({ rows: [], comparison: null, error: null });
  },

  saveCurrentComparison: async (label) => {
    const { rows } = get();
    const snapshot: SavedComparison = {
      id: crypto.randomUUID(),
      label,
      savedAt: new Date().toISOString(),
      rows,
    };

    set({ persistenceStatus: 'saving', persistenceError: null });
    try {
      await activeRepository.save(snapshot.id, snapshot);
    } catch (error) {
      set({
        persistenceStatus: 'error',
        persistenceError:
          error instanceof Error
            ? `No se pudo guardar la comparación (${error.message}).`
            : 'No se pudo guardar la comparación.',
      });
      return;
    }
    set({ persistenceStatus: 'idle' });
    await get().loadSavedComparisons();
  },

  loadSavedComparisons: async () => {
    set({ persistenceStatus: 'loading', persistenceError: null });
    try {
      const all = await activeRepository.findAll();
      set({ savedComparisons: all.filter(isSavedComparison), persistenceStatus: 'idle' });
    } catch (error) {
      set({
        persistenceStatus: 'error',
        persistenceError:
          error instanceof Error
            ? `No se pudieron cargar las comparaciones guardadas (${error.message}).`
            : 'No se pudieron cargar las comparaciones guardadas.',
      });
    }
  },

  loadSavedComparison: (id) => {
    const saved = get().savedComparisons.find((entry) => entry.id === id);
    if (saved === undefined) return;
    set({ rows: saved.rows, comparison: null, error: null });
  },

  deleteSavedComparison: async (id) => {
    try {
      await activeRepository.remove(id);
    } catch (error) {
      set({
        persistenceStatus: 'error',
        persistenceError:
          error instanceof Error
            ? `No se pudo eliminar la comparación (${error.message}).`
            : 'No se pudo eliminar la comparación.',
      });
      return;
    }
    await get().loadSavedComparisons();
  },
}));
