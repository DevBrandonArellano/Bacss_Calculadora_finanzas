import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DebtVsInvestmentPanel } from './DebtVsInvestmentPanel';
import { useInvestmentStore } from '../state/investmentStore';
import { INVESTMENT_DISCLAIMER } from '../../domain/investments/debtVsInvestmentComparator';

function resetStore() {
  useInvestmentStore.getState().reset();
}

function fillForm() {
  fireEvent.change(screen.getByLabelText(/dinero disponible/i), { target: { value: '5000' } });
  fireEvent.change(screen.getByLabelText(/monto del préstamo/i), { target: { value: '10000' } });
  fireEvent.change(screen.getByLabelText(/tasa del préstamo/i), { target: { value: '12' } });
  fireEvent.change(screen.getByLabelText(/horizonte/i), { target: { value: '12' } });
  fireEvent.change(screen.getByLabelText(/conversión de tasa/i), { target: { value: 'nominal' } });
  fireEvent.change(screen.getByLabelText(/rendimiento esperado/i), { target: { value: '10' } });
  fireEvent.change(screen.getByLabelText(/aportes mensuales/i), { target: { value: '100' } });
}

describe('DebtVsInvestmentPanel', () => {
  beforeEach(() => {
    resetStore();
  });

  it('debe mostrar el disclaimer siempre, incluso antes de comparar', () => {
    render(<DebtVsInvestmentPanel />);
    expect(screen.getByText(INVESTMENT_DISCLAIMER)).toBeInTheDocument();
  });

  it('debe mostrar el resultado y la recomendación luego de comparar', () => {
    render(<DebtVsInvestmentPanel />);
    fillForm();

    fireEvent.click(screen.getByRole('button', { name: /^comparar$/i }));

    expect(screen.getByText(/ahorro garantizado/i)).toBeInTheDocument();
    expect(screen.getByText(/ganancia esperada/i)).toBeInTheDocument();
    expect(screen.getByText(/punto de equilibrio/i)).toBeInTheDocument();
    expect(screen.getByText(INVESTMENT_DISCLAIMER)).toBeInTheDocument();
  });

  it('debe mostrar el ROI de la inversión como porcentaje luego de comparar', () => {
    render(<DebtVsInvestmentPanel />);
    fillForm();

    fireEvent.click(screen.getByRole('button', { name: /^comparar$/i }));

    const label = screen.getByText('ROI de la inversión');
    const value = label.nextElementSibling;
    expect(value?.textContent).toMatch(/^-?\d+(\.\d+)?%$/);
  });

  it('debe mostrar un error cuando falta el método de conversión de tasa', () => {
    render(<DebtVsInvestmentPanel />);

    fireEvent.click(screen.getByRole('button', { name: /^comparar$/i }));

    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});
