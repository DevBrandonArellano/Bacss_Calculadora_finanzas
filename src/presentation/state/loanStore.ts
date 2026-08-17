import { create } from 'zustand';
import { calculateSchedule } from '../../application/use-cases/calculateSchedule';
import { simulateExtraPayments } from '../../application/use-cases/simulateExtraPayments';
import { Money } from '../../domain/shared/money';
import { InterestRate } from '../../domain/shared/interestRate';
import { Term } from '../../domain/shared/term';
import { FrenchAmortization } from '../../domain/loans/frenchAmortization';
import { GermanAmortization } from '../../domain/loans/germanAmortization';
import { ReduceTermStrategy } from '../../domain/loans/extra-payments/reduceTermStrategy';
import { ReducePaymentStrategy } from '../../domain/loans/extra-payments/reducePaymentStrategy';
import { DomainError } from '../../domain/shared/errors';
import { translateDomainError } from './translateDomainError';
import type {
  AmortizationRequest,
  AmortizationResult,
} from '../../domain/loans/amortizationEngine';
import type { ExtraPayment } from '../../domain/loans/extra-payments/extraPayment';
import type { ExtraPaymentComparison } from '../../domain/loans/extra-payments/extraPaymentSimulator';
import type { RecurringContribution } from '../../domain/loans/extra-payments/recurringContribution';
import type { MonthlyConversionMethod } from '../../domain/shared/interestRate';
import type { Logger } from '../../application/ports/logger';

/** Logger nulo por defecto: la app no importa `infrastructure` directamente
 * desde `presentation` (regla arquitectónica de Fase 0). El composition root
 * (`main.tsx`) inyecta el `Rfc5424Logger` real vía `setLoanStoreLogger`. */
class NoOpLogger implements Logger {
  log(): void {
    // sin operación por defecto
  }
}

let activeLogger: Logger = new NoOpLogger();

export function setLoanStoreLogger(logger: Logger): void {
  activeLogger = logger;
}

export type AmortizationSystemName = 'french' | 'german';
export type TermUnit = 'months' | 'years';
export type ExtraPaymentStrategyName = 'reduce-term' | 'reduce-payment';

export interface ExtraPaymentRowState {
  readonly id: string;
  readonly periodNumber: string;
  readonly amount: string;
}

export interface RecurringContributionRowState {
  readonly id: string;
  readonly amount: string;
  readonly startPeriod: string;
  readonly endPeriod: string;
}

export type LoanResult =
  | { readonly kind: 'simple'; readonly data: AmortizationResult }
  | { readonly kind: 'withExtraPayments'; readonly data: ExtraPaymentComparison };

export interface ExtraPaymentInputs {
  readonly extraPayments: readonly ExtraPayment[];
  readonly recurringContributions: readonly RecurringContribution[];
}

export interface LoanFormState {
  readonly principal: string;
  readonly annualRatePercent: string;
  readonly termValue: string;
  readonly termUnit: TermUnit;
  readonly system: AmortizationSystemName;
  readonly rateConversionMethod: MonthlyConversionMethod | '';
  readonly startDate: string;
  readonly optionalCosts: string;
  readonly extraPayments: readonly ExtraPaymentRowState[];
  readonly recurringContributions: readonly RecurringContributionRowState[];
  readonly strategy: ExtraPaymentStrategyName;
}

export interface LoanStoreState {
  readonly form: LoanFormState;
  readonly result: LoanResult | null;
  readonly baseRequest: AmortizationRequest | null;
  readonly extraPaymentInputs: ExtraPaymentInputs | null;
  readonly optionalCosts: Money;
  readonly error: string | null;
  updateForm: (patch: Partial<LoanFormState>) => void;
  addExtraPaymentRow: () => void;
  removeExtraPaymentRow: (id: string) => void;
  updateExtraPaymentRow: (id: string, patch: Partial<Omit<ExtraPaymentRowState, 'id'>>) => void;
  addRecurringContributionRow: () => void;
  removeRecurringContributionRow: (id: string) => void;
  updateRecurringContributionRow: (
    id: string,
    patch: Partial<Omit<RecurringContributionRowState, 'id'>>,
  ) => void;
  calculate: () => void;
  reset: () => void;
}

const initialForm: LoanFormState = {
  principal: '',
  annualRatePercent: '',
  termValue: '',
  termUnit: 'months',
  system: 'french',
  rateConversionMethod: '',
  startDate: new Date().toISOString().slice(0, 10),
  optionalCosts: '',
  extraPayments: [],
  recurringContributions: [],
  strategy: 'reduce-term',
};

export const useLoanStore = create<LoanStoreState>((set, get) => ({
  form: initialForm,
  result: null,
  baseRequest: null,
  extraPaymentInputs: null,
  optionalCosts: Money.zero('USD'),
  error: null,

  updateForm: (patch) => {
    set((state) => ({ form: { ...state.form, ...patch }, error: null }));
  },

  addExtraPaymentRow: () => {
    const row: ExtraPaymentRowState = {
      id: crypto.randomUUID(),
      periodNumber: '',
      amount: '',
    };
    set((state) => ({
      form: { ...state.form, extraPayments: [...state.form.extraPayments, row] },
    }));
  },

  removeExtraPaymentRow: (id) => {
    set((state) => ({
      form: {
        ...state.form,
        extraPayments: state.form.extraPayments.filter((row) => row.id !== id),
      },
    }));
  },

  updateExtraPaymentRow: (id, patch) => {
    set((state) => ({
      form: {
        ...state.form,
        extraPayments: state.form.extraPayments.map((row) =>
          row.id === id ? { ...row, ...patch } : row,
        ),
      },
    }));
  },

  addRecurringContributionRow: () => {
    const row: RecurringContributionRowState = {
      id: crypto.randomUUID(),
      amount: '',
      startPeriod: '',
      endPeriod: '',
    };
    set((state) => ({
      form: {
        ...state.form,
        recurringContributions: [...state.form.recurringContributions, row],
      },
    }));
  },

  removeRecurringContributionRow: (id) => {
    set((state) => ({
      form: {
        ...state.form,
        recurringContributions: state.form.recurringContributions.filter((row) => row.id !== id),
      },
    }));
  },

  updateRecurringContributionRow: (id, patch) => {
    set((state) => ({
      form: {
        ...state.form,
        recurringContributions: state.form.recurringContributions.map((row) =>
          row.id === id ? { ...row, ...patch } : row,
        ),
      },
    }));
  },

  calculate: () => {
    const { form } = get();

    try {
      if (form.rateConversionMethod === '') {
        throw new Error('Debes seleccionar el método de conversión de tasa (nominal o efectiva).');
      }

      const principal = Money.ofNonNegative(form.principal || '0', 'USD');
      const annualRate = InterestRate.fromPercentage(form.annualRatePercent || '0');
      const termValue = Number(form.termValue || '0');
      const term = form.termUnit === 'years' ? Term.ofYears(termValue) : Term.ofMonths(termValue);
      const system = form.system === 'french' ? new FrenchAmortization() : new GermanAmortization();
      const startDate = new Date(`${form.startDate}T00:00:00.000Z`);
      const optionalCosts = Money.ofNonNegative(form.optionalCosts || '0', 'USD');

      const baseRequest: AmortizationRequest = {
        system,
        principal,
        annualRate,
        rateConversionMethod: form.rateConversionMethod,
        term,
        startDate,
      };

      const extraPayments: ExtraPayment[] = form.extraPayments
        .filter((row) => row.periodNumber.trim() !== '' && row.amount.trim() !== '')
        .map((row) => ({
          periodNumber: Number(row.periodNumber),
          amount: Money.ofNonNegative(row.amount, 'USD'),
        }));

      const recurringContributions: RecurringContribution[] = form.recurringContributions
        .filter(
          (row) =>
            row.amount.trim() !== '' &&
            row.startPeriod.trim() !== '' &&
            row.endPeriod.trim() !== '',
        )
        .map((row) => ({
          amount: Money.ofNonNegative(row.amount, 'USD'),
          startPeriod: Number(row.startPeriod),
          endPeriod: Number(row.endPeriod),
        }));

      let result: LoanResult;
      let extraPaymentInputs: ExtraPaymentInputs | null = null;
      if (extraPayments.length > 0 || recurringContributions.length > 0) {
        const strategy =
          form.strategy === 'reduce-term' ? new ReduceTermStrategy() : new ReducePaymentStrategy();
        const comparison = simulateExtraPayments(
          { baseRequest, strategy, extraPayments, recurringContributions },
          activeLogger,
        );
        result = { kind: 'withExtraPayments', data: comparison };
        extraPaymentInputs = { extraPayments, recurringContributions };
      } else {
        const schedule = calculateSchedule(baseRequest, activeLogger);
        result = { kind: 'simple', data: schedule };
      }

      set({ result, baseRequest, extraPaymentInputs, optionalCosts, error: null });
    } catch (error) {
      const message =
        error instanceof DomainError
          ? translateDomainError(error)
          : error instanceof Error
            ? error.message
            : 'Ocurrió un error inesperado al calcular el préstamo.';
      set({ result: null, error: message });
    }
  },

  reset: () => {
    set({
      form: initialForm,
      result: null,
      baseRequest: null,
      extraPaymentInputs: null,
      optionalCosts: Money.zero('USD'),
      error: null,
    });
  },
}));
