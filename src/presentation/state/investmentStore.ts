import { create } from 'zustand';
import Decimal from 'decimal.js';
import { compareDebtVsInvestment } from '../../application/use-cases/compareDebtVsInvestment';
import { Money } from '../../domain/shared/money';
import { InterestRate } from '../../domain/shared/interestRate';
import { DomainError } from '../../domain/shared/errors';
import { translateDomainError } from './translateDomainError';
import type { DebtVsInvestmentResult } from '../../domain/investments/debtVsInvestmentComparator';
import type { MonthlyConversionMethod } from '../../domain/shared/interestRate';
import type { Logger } from '../../application/ports/logger';

class NoOpLogger implements Logger {
  log(): void {
    // sin operación por defecto
  }
}

let activeLogger: Logger = new NoOpLogger();

export function setInvestmentStoreLogger(logger: Logger): void {
  activeLogger = logger;
}

export interface InvestmentFormState {
  readonly availableAmount: string;
  readonly loanPrincipal: string;
  readonly loanAnnualRatePercent: string;
  readonly loanTermValue: string;
  readonly loanStartDate: string;
  readonly rateConversionMethod: MonthlyConversionMethod | '';
  readonly expectedReturnPercent: string;
  readonly monthlyContribution: string;
  readonly taxRatePercent: string;
}

export interface InvestmentStoreState {
  readonly form: InvestmentFormState;
  readonly result: DebtVsInvestmentResult | null;
  readonly error: string | null;
  updateForm: (patch: Partial<InvestmentFormState>) => void;
  compare: () => void;
  reset: () => void;
}

const initialForm: InvestmentFormState = {
  availableAmount: '',
  loanPrincipal: '',
  loanAnnualRatePercent: '',
  loanTermValue: '',
  loanStartDate: new Date().toISOString().slice(0, 10),
  rateConversionMethod: '',
  expectedReturnPercent: '',
  monthlyContribution: '',
  taxRatePercent: '',
};

export const useInvestmentStore = create<InvestmentStoreState>((set, get) => ({
  form: initialForm,
  result: null,
  error: null,

  updateForm: (patch) => {
    set((state) => ({ form: { ...state.form, ...patch }, error: null }));
  },

  compare: () => {
    const { form } = get();

    try {
      if (form.rateConversionMethod === '') {
        throw new Error('Debes seleccionar el método de conversión de tasa (nominal o efectiva).');
      }

      const availableAmount = Money.ofNonNegative(form.availableAmount || '0', 'USD');
      const loanPrincipal = Money.ofNonNegative(form.loanPrincipal || '0', 'USD');
      const loanAnnualRate = InterestRate.fromPercentage(form.loanAnnualRatePercent || '0');
      const loanTermMonths = Number(form.loanTermValue || '0');
      const loanStartDate = new Date(`${form.loanStartDate}T00:00:00.000Z`);
      const expectedReturnRate = InterestRate.fromPercentage(form.expectedReturnPercent || '0');
      const monthlyContribution = Money.ofNonNegative(form.monthlyContribution || '0', 'USD');
      const taxRate = new Decimal(form.taxRatePercent || '0').dividedBy(100);

      const result = compareDebtVsInvestment(
        {
          availableAmount,
          loanPrincipal,
          loanAnnualRate,
          loanRateConversionMethod: form.rateConversionMethod,
          loanTermMonths,
          loanStartDate,
          investment: {
            initialAmount: availableAmount,
            monthlyContribution,
            annualReturnRate: expectedReturnRate,
            rateConversionMethod: form.rateConversionMethod,
            months: loanTermMonths,
            taxRate,
          },
        },
        activeLogger,
      );

      set({ result, error: null });
    } catch (error) {
      const message =
        error instanceof DomainError
          ? translateDomainError(error)
          : error instanceof Error
            ? error.message
            : 'Ocurrió un error inesperado al comparar deuda vs inversión.';
      set({ result: null, error: message });
    }
  },

  reset: () => {
    set({ form: initialForm, result: null, error: null });
  },
}));
