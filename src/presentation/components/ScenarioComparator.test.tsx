import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ScenarioComparator } from './ScenarioComparator';
import { useScenarioStore, setScenarioStoreRepository } from '../state/scenarioStore';
import type { ScenarioRepository } from '../../application/ports/scenarioRepository';

function resetStore() {
  useScenarioStore.getState().reset();
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

describe('ScenarioComparator — guardar y cargar comparaciones', () => {
  beforeEach(() => {
    resetStore();
    setScenarioStoreRepository(fakeRepository());
  });

  it('el botón de guardar está deshabilitado sin escenarios', () => {
    render(<ScenarioComparator />);
    expect(screen.getByRole('button', { name: /guardar comparación/i })).toBeDisabled();
  });

  it('guarda la comparación actual con la etiqueta ingresada', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    setScenarioStoreRepository(fakeRepository({ save }));
    render(<ScenarioComparator />);
    fireEvent.click(screen.getByRole('button', { name: /agregar escenario/i }));

    fireEvent.change(screen.getByLabelText(/nombre de la comparación/i), {
      target: { value: 'Mi comparación' },
    });
    fireEvent.click(screen.getByRole('button', { name: /guardar comparación/i }));

    await waitFor(() => {
      expect(save).toHaveBeenCalledTimes(1);
    });
  });

  it('muestra las comparaciones guardadas con opción de cargar y eliminar', async () => {
    const saved = { id: 's1', label: 'Guardada', savedAt: '2026-01-01T00:00:00Z', rows: [] };
    setScenarioStoreRepository(fakeRepository({ findAll: vi.fn().mockResolvedValue([saved]) }));

    render(<ScenarioComparator />);

    expect(await screen.findByText('Guardada')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cargar guardada/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /eliminar guardada/i })).toBeInTheDocument();
  });

  it('muestra un aviso de "guardado solo en este dispositivo" cuando falla la sincronización remota', async () => {
    const repository = fakeRepository({
      save: vi.fn().mockResolvedValue(undefined),
    });
    setScenarioStoreRepository(repository);
    render(<ScenarioComparator />);
    fireEvent.click(screen.getByRole('button', { name: /agregar escenario/i }));

    useScenarioStore.setState({ syncStatus: 'offline' });

    expect(await screen.findByText(/guardados solo en este dispositivo/i)).toBeInTheDocument();
  });
});
