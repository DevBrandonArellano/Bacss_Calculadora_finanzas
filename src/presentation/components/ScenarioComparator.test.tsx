import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ScenarioComparator } from './ScenarioComparator';
import { useScenarioStore } from '../state/scenarioStore';

function resetStore() {
  useScenarioStore.getState().reset();
}

function fillScenario(label: string, principal: string, term: string) {
  fireEvent.change(screen.getByLabelText(new RegExp(`monto \\(${label}\\)`, 'i')), {
    target: { value: principal },
  });
  fireEvent.change(screen.getByLabelText(new RegExp(`tasa anual \\(${label}\\)`, 'i')), {
    target: { value: '12' },
  });
  fireEvent.change(screen.getByLabelText(new RegExp(`^plazo \\(${label}\\)`, 'i')), {
    target: { value: term },
  });
  fireEvent.change(screen.getByLabelText(new RegExp(`conversión de tasa \\(${label}\\)`, 'i')), {
    target: { value: 'nominal' },
  });
}

describe('ScenarioComparator', () => {
  beforeEach(() => {
    resetStore();
  });

  it('debe mostrar un mensaje cuando no hay escenarios', () => {
    render(<ScenarioComparator />);
    expect(screen.getByText(/agrega al menos un escenario/i)).toBeInTheDocument();
  });

  it('debe agregar filas de escenario con campos editables', () => {
    render(<ScenarioComparator />);

    fireEvent.click(screen.getByRole('button', { name: /agregar escenario/i }));

    expect(screen.getByText('Escenario A')).toBeInTheDocument();
    expect(screen.getByLabelText(/monto \(escenario a\)/i)).toBeInTheDocument();
  });

  it('debe quitar una fila de escenario', () => {
    render(<ScenarioComparator />);
    fireEvent.click(screen.getByRole('button', { name: /agregar escenario/i }));

    fireEvent.click(screen.getByRole('button', { name: /quitar escenario a/i }));

    expect(screen.queryByText('Escenario A')).not.toBeInTheDocument();
  });

  it('debe comparar escenarios y mostrar la tabla comparativa', () => {
    render(<ScenarioComparator />);
    fireEvent.click(screen.getByRole('button', { name: /agregar escenario/i }));
    fireEvent.click(screen.getByRole('button', { name: /agregar escenario/i }));

    fillScenario('Escenario A', '10000', '12');
    fillScenario('Escenario B', '10000', '24');

    fireEvent.click(screen.getByRole('button', { name: /^comparar$/i }));

    const rows = screen.getAllByRole('row').slice(1);
    expect(rows).toHaveLength(2);
    expect(useScenarioStore.getState().error).toBeNull();
  });

  it('debe mostrar un error de dominio traducido cuando falta el método de conversión', () => {
    render(<ScenarioComparator />);
    fireEvent.click(screen.getByRole('button', { name: /agregar escenario/i }));

    fireEvent.click(screen.getByRole('button', { name: /^comparar$/i }));

    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});
