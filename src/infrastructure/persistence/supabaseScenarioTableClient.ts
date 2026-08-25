import type { SupabaseClient } from '@supabase/supabase-js';
import type { ScenarioRow, ScenarioTableClient } from './scenarioTableClient';

const TABLE = 'scenarios';

interface PostgrestErrorLike {
  readonly message: string;
}

function toError(error: PostgrestErrorLike | null): Error | null {
  return error === null ? null : new Error(error.message);
}

/**
 * Adaptador delgado: traduce el `ScenarioTableClient` a llamadas reales de
 * supabase-js. Sin un tipo `Database` generado, el cliente devuelve `data`
 * como `any` — se castea explícitamente aquí, en el único lugar del proyecto
 * que conoce la forma real de la tabla `scenarios`.
 */
export class SupabaseScenarioTableClient implements ScenarioTableClient {
  private readonly client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  async upsert(row: ScenarioRow): Promise<{ error: Error | null }> {
    const result = (await this.client.from(TABLE).upsert(row)) as { error: PostgrestErrorLike | null };
    return { error: toError(result.error) };
  }

  async selectById(id: string): Promise<{ data: ScenarioRow | null; error: Error | null }> {
    const result = (await this.client.from(TABLE).select('*').eq('id', id).maybeSingle()) as {
      data: ScenarioRow | null;
      error: PostgrestErrorLike | null;
    };
    return { data: result.data ?? null, error: toError(result.error) };
  }

  async selectAll(): Promise<{ data: readonly ScenarioRow[] | null; error: Error | null }> {
    const result = (await this.client.from(TABLE).select('*')) as {
      data: ScenarioRow[] | null;
      error: PostgrestErrorLike | null;
    };
    return { data: result.data, error: toError(result.error) };
  }

  async deleteById(id: string): Promise<{ error: Error | null }> {
    const result = (await this.client.from(TABLE).delete().eq('id', id)) as {
      error: PostgrestErrorLike | null;
    };
    return { error: toError(result.error) };
  }
}
