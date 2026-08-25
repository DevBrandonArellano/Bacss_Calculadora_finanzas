import { describe, it, expect, vi } from 'vitest';
import { SupabaseScenarioRepository } from './supabaseScenarioRepository';
import type { ScenarioTableClient, ScenarioRow } from './scenarioTableClient';

function fakeTableClient(overrides: Partial<ScenarioTableClient> = {}): ScenarioTableClient {
  return {
    upsert: vi.fn().mockResolvedValue({ error: null }),
    selectById: vi.fn().mockResolvedValue({ data: null, error: null }),
    selectAll: vi.fn().mockResolvedValue({ data: [], error: null }),
    deleteById: vi.fn().mockResolvedValue({ error: null }),
    ...overrides,
  };
}

describe('SupabaseScenarioRepository', () => {
  it('save() hace upsert con el id, el escenario y una marca de tiempo', async () => {
    const upsert = vi
      .fn<(row: { id: string; data: unknown; updated_at: string }) => Promise<{ error: null }>>()
      .mockResolvedValue({ error: null });
    const repo = new SupabaseScenarioRepository(fakeTableClient({ upsert }));
    const scenario = { label: 'Escenario A' };

    await repo.save('a1', scenario);

    expect(upsert).toHaveBeenCalledTimes(1);
    const [row] = upsert.mock.calls[0] ?? [];
    expect(row).toMatchObject({ id: 'a1', data: scenario });
    expect(typeof row?.updated_at).toBe('string');
  });

  it('save() propaga el error cuando upsert falla', async () => {
    const table = fakeTableClient({
      upsert: vi.fn().mockResolvedValue({ error: new Error('conexión perdida') }),
    });
    const repo = new SupabaseScenarioRepository(table);

    await expect(repo.save('a1', { label: 'A' })).rejects.toThrow('conexión perdida');
  });

  it('findById() devuelve el escenario guardado', async () => {
    const row: ScenarioRow = { id: 'a1', data: { label: 'A' }, updated_at: '2026-01-01T00:00:00Z' };
    const table = fakeTableClient({ selectById: vi.fn().mockResolvedValue({ data: row, error: null }) });
    const repo = new SupabaseScenarioRepository(table);

    expect(await repo.findById('a1')).toEqual({ label: 'A' });
  });

  it('findById() devuelve null cuando el id no existe', async () => {
    const table = fakeTableClient();
    const repo = new SupabaseScenarioRepository(table);

    expect(await repo.findById('no-existe')).toBeNull();
  });

  it('findById() propaga el error cuando la consulta falla', async () => {
    const table = fakeTableClient({
      selectById: vi.fn().mockResolvedValue({ data: null, error: new Error('timeout') }),
    });
    const repo = new SupabaseScenarioRepository(table);

    await expect(repo.findById('a1')).rejects.toThrow('timeout');
  });

  it('findAll() devuelve solo los datos de cada fila', async () => {
    const rows: ScenarioRow[] = [
      { id: 'a1', data: { label: 'A' }, updated_at: '2026-01-01T00:00:00Z' },
      { id: 'a2', data: { label: 'B' }, updated_at: '2026-01-02T00:00:00Z' },
    ];
    const table = fakeTableClient({ selectAll: vi.fn().mockResolvedValue({ data: rows, error: null }) });
    const repo = new SupabaseScenarioRepository(table);

    expect(await repo.findAll()).toEqual([{ label: 'A' }, { label: 'B' }]);
  });

  it('findAll() propaga el error cuando la consulta falla', async () => {
    const table = fakeTableClient({
      selectAll: vi.fn().mockResolvedValue({ data: null, error: new Error('sin red') }),
    });
    const repo = new SupabaseScenarioRepository(table);

    await expect(repo.findAll()).rejects.toThrow('sin red');
  });

  it('remove() llama deleteById con el id', async () => {
    const deleteById = vi.fn().mockResolvedValue({ error: null });
    const repo = new SupabaseScenarioRepository(fakeTableClient({ deleteById }));

    await repo.remove('a1');

    expect(deleteById).toHaveBeenCalledWith('a1');
  });

  it('remove() propaga el error cuando la eliminación falla', async () => {
    const table = fakeTableClient({
      deleteById: vi.fn().mockResolvedValue({ error: new Error('no autorizado') }),
    });
    const repo = new SupabaseScenarioRepository(table);

    await expect(repo.remove('a1')).rejects.toThrow('no autorizado');
  });
});
