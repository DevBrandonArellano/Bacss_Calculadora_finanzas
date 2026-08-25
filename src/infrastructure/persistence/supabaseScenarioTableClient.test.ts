import { describe, it, expect, vi } from 'vitest';
import { SupabaseScenarioTableClient } from './supabaseScenarioTableClient';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Fake que imita solo la porción de la cadena de `@supabase/supabase-js`
 * (`from().select().eq().maybeSingle()`, etc.) que `SupabaseScenarioTableClient`
 * usa realmente — el cliente real es difícil de mockear fielmente completo.
 */
function fakeSupabaseClient(methods: {
  upsert?: ReturnType<typeof vi.fn>;
  maybeSingle?: ReturnType<typeof vi.fn>;
  select?: ReturnType<typeof vi.fn>;
  eq?: ReturnType<typeof vi.fn>;
}): { client: SupabaseClient; from: ReturnType<typeof vi.fn> } {
  const maybeSingle = methods.maybeSingle ?? vi.fn().mockResolvedValue({ data: null, error: null });
  const eq = methods.eq ?? vi.fn(() => ({ maybeSingle }));
  const select = methods.select ?? vi.fn(() => ({ eq }));
  const upsert = methods.upsert ?? vi.fn().mockResolvedValue({ error: null });
  const deleteEq = vi.fn().mockResolvedValue({ error: null });
  const del = vi.fn(() => ({ eq: deleteEq }));
  const from = vi.fn(() => ({ upsert, select, delete: del }));

  return { client: { from } as unknown as SupabaseClient, from };
}

describe('SupabaseScenarioTableClient', () => {
  it('upsert() delega en client.from("scenarios").upsert(row)', async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const { client, from } = fakeSupabaseClient({ upsert });
    const table = new SupabaseScenarioTableClient(client);
    const row = { id: 'a1', data: { label: 'A' }, updated_at: '2026-01-01T00:00:00Z' };

    const result = await table.upsert(row);

    expect(from).toHaveBeenCalledWith('scenarios');
    expect(upsert).toHaveBeenCalledWith(row);
    expect(result.error).toBeNull();
  });

  it('upsert() convierte el PostgrestError a Error', async () => {
    const upsert = vi.fn().mockResolvedValue({ error: { message: 'RLS violation', code: '42501' } });
    const { client } = fakeSupabaseClient({ upsert });
    const table = new SupabaseScenarioTableClient(client);

    const result = await table.upsert({ id: 'a1', data: {}, updated_at: '2026-01-01T00:00:00Z' });

    expect(result.error).toBeInstanceOf(Error);
    expect(result.error?.message).toBe('RLS violation');
  });

  it('selectById() filtra por id y devuelve una sola fila', async () => {
    const row = { id: 'a1', data: { label: 'A' }, updated_at: '2026-01-01T00:00:00Z' };
    const maybeSingle = vi.fn().mockResolvedValue({ data: row, error: null });
    const eq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq }));
    const { client } = fakeSupabaseClient({ select });
    const table = new SupabaseScenarioTableClient(client);

    const result = await table.selectById('a1');

    expect(eq).toHaveBeenCalledWith('id', 'a1');
    expect(result.data).toEqual(row);
  });

  it('selectById() devuelve data null cuando no hay fila', async () => {
    const { client } = fakeSupabaseClient({});
    const table = new SupabaseScenarioTableClient(client);

    const result = await table.selectById('no-existe');

    expect(result.data).toBeNull();
    expect(result.error).toBeNull();
  });

  it('selectAll() devuelve todas las filas visibles bajo RLS', async () => {
    const rows = [{ id: 'a1', data: { label: 'A' }, updated_at: '2026-01-01T00:00:00Z' }];
    const select = vi.fn().mockResolvedValue({ data: rows, error: null });
    const { client } = fakeSupabaseClient({ select });
    const table = new SupabaseScenarioTableClient(client);

    const result = await table.selectAll();

    expect(result.data).toEqual(rows);
  });

  it('deleteById() filtra por id', async () => {
    const { client } = fakeSupabaseClient({});
    const table = new SupabaseScenarioTableClient(client);

    const result = await table.deleteById('a1');

    expect(result.error).toBeNull();
  });
});
