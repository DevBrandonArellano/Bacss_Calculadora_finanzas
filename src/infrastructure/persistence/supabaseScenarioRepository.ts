import type { ScenarioRepository } from '../../application/ports/scenarioRepository';
import type { ScenarioTableClient } from './scenarioTableClient';

export class SupabaseScenarioRepository implements ScenarioRepository {
  private readonly table: ScenarioTableClient;

  constructor(table: ScenarioTableClient) {
    this.table = table;
  }

  async save(id: string, scenario: unknown): Promise<void> {
    const { error } = await this.table.upsert({
      id,
      data: scenario,
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
  }

  async findById(id: string): Promise<unknown> {
    const { data, error } = await this.table.selectById(id);
    if (error) throw error;
    return data === null ? null : data.data;
  }

  async findAll(): Promise<readonly unknown[]> {
    const { data, error } = await this.table.selectAll();
    if (error) throw error;
    return (data ?? []).map((row) => row.data);
  }

  async remove(id: string): Promise<void> {
    const { error } = await this.table.deleteById(id);
    if (error) throw error;
  }
}
