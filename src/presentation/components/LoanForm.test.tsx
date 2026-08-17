import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LoanForm } from './LoanForm';
import { useLoanStore } from '../state/loanStore';

function resetStore() {
  useLoanStore.getState().reset();
}

describe('LoanForm', () => {
  beforeEach(() => {
    resetStore();
  });

  it('debe renderizar todos los campos del formulario', () => {
    render(<LoanForm />);

    expect(screen.getByLabelText(/monto/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/tasa anual/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/plazo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/sistema/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/conversión de tasa/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/fecha de inicio/i)).toBeInTheDocument();
  });

  it('debe actualizar el store cuando el usuario cambia el monto', () => {
    render(<LoanForm />);
    const input = screen.getByLabelText(/monto/i);

    fireEvent.change(input, { target: { value: '10000' } });

    expect(useLoanStore.getState().form.principal).toBe('10000');
  });

  it('debe renderizar el campo de costos opcionales y actualizar el store', () => {
    render(<LoanForm />);
    const input = screen.getByLabelText(/costos opcionales/i);

    fireEvent.change(input, { target: { value: '250' } });

    expect(useLoanStore.getState().form.optionalCosts).toBe('250');
  });

  it('debe calcular y mostrar la cuota cuando se envía el formulario con datos válidos (Caso 1)', () => {
    render(<LoanForm />);

    fireEvent.change(screen.getByLabelText(/monto/i), { target: { value: '10000' } });
    fireEvent.change(screen.getByLabelText(/tasa anual/i), { target: { value: '12' } });
    fireEvent.change(screen.getByLabelText(/plazo/i), { target: { value: '12' } });
    fireEvent.change(screen.getByLabelText(/conversión de tasa/i), {
      target: { value: 'nominal' },
    });
    fireEvent.click(screen.getByRole('button', { name: /calcular/i }));

    const result = useLoanStore.getState().result;
    expect(result?.kind === 'simple' ? result.data.summary.installment?.toFixed(2) : null).toBe(
      '888.49',
    );
    expect(useLoanStore.getState().error).toBeNull();
  });

  it('debe agregar y quitar filas de abono extraordinario', () => {
    render(<LoanForm />);

    fireEvent.click(screen.getByRole('button', { name: /agregar abono/i }));

    expect(screen.getByLabelText(/período del abono 1/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/monto del abono 1/i)).toBeInTheDocument();
    expect(useLoanStore.getState().form.extraPayments).toHaveLength(1);

    fireEvent.change(screen.getByLabelText(/período del abono 1/i), { target: { value: '3' } });
    fireEvent.change(screen.getByLabelText(/monto del abono 1/i), { target: { value: '2000' } });

    expect(useLoanStore.getState().form.extraPayments[0]).toMatchObject({
      periodNumber: '3',
      amount: '2000',
    });

    fireEvent.click(screen.getByRole('button', { name: /quitar abono 1/i }));

    expect(useLoanStore.getState().form.extraPayments).toHaveLength(0);
  });

  it('debe mostrar el selector de estrategia solo cuando hay al menos un abono', () => {
    render(<LoanForm />);

    expect(screen.queryByLabelText(/estrategia/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /agregar abono/i }));

    expect(screen.getByLabelText(/estrategia/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/estrategia/i), { target: { value: 'reduce-payment' } });

    expect(useLoanStore.getState().form.strategy).toBe('reduce-payment');
  });

  it('debe agregar y quitar filas de aporte recurrente', () => {
    render(<LoanForm />);

    fireEvent.click(screen.getByRole('button', { name: /agregar aporte recurrente/i }));

    expect(screen.getByLabelText(/monto mensual del aporte 1/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/desde el periodo del aporte 1/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/hasta el periodo del aporte 1/i)).toBeInTheDocument();
    expect(useLoanStore.getState().form.recurringContributions).toHaveLength(1);

    fireEvent.change(screen.getByLabelText(/monto mensual del aporte 1/i), {
      target: { value: '500' },
    });
    fireEvent.change(screen.getByLabelText(/desde el periodo del aporte 1/i), {
      target: { value: '1' },
    });
    fireEvent.change(screen.getByLabelText(/hasta el periodo del aporte 1/i), {
      target: { value: '6' },
    });

    expect(useLoanStore.getState().form.recurringContributions[0]).toMatchObject({
      amount: '500',
      startPeriod: '1',
      endPeriod: '6',
    });

    fireEvent.click(screen.getByRole('button', { name: /quitar aporte recurrente 1/i }));

    expect(useLoanStore.getState().form.recurringContributions).toHaveLength(0);
  });

  it('debe mostrar el selector de estrategia cuando hay al menos un aporte recurrente (sin abonos únicos)', () => {
    render(<LoanForm />);

    fireEvent.click(screen.getByRole('button', { name: /agregar aporte recurrente/i }));

    expect(screen.getByLabelText(/estrategia/i)).toBeInTheDocument();
  });

  it('debe mostrar un mensaje de error de dominio traducido cuando la validación falla', () => {
    render(<LoanForm />);

    fireEvent.change(screen.getByLabelText(/monto/i), { target: { value: '0' } });
    fireEvent.change(screen.getByLabelText(/tasa anual/i), { target: { value: '12' } });
    fireEvent.change(screen.getByLabelText(/plazo/i), { target: { value: '12' } });
    fireEvent.change(screen.getByLabelText(/conversión de tasa/i), {
      target: { value: 'nominal' },
    });
    fireEvent.click(screen.getByRole('button', { name: /calcular/i }));

    expect(useLoanStore.getState().error).not.toBeNull();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});
