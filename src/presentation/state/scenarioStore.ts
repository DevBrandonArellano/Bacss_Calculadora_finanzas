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

class NoOpLogger implements Logger {
  log(): void {
    // sin operación por defecto
  }
}

let activeLogger: Logger = new NoOpLogger();

export function setScenarioStoreLogger(logger: Logger): void {
  activeLogger = logger;
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

export interface ScenarioStoreState {
  readonly rows: readonly ScenarioRowState[];
  readonly comparison: ScenarioComparisonResult | null;
  readonly error: string | null;
  addRow: () => void;
  removeRow: (id: string) => void;
  updateRow: (id: string, patch: Partial<Omit<ScenarioRowState, 'id' | 'label'>>) => void;
  compare: () => void;
  reset: () => void;
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
}));
