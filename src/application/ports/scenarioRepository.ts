/**
 * API asíncrona (ADR 0012, restricción 1): Supabase es asíncrono de punta a
 * punta, así que el puerto lo es también, aunque `LocalStorageScenarioRepository`
 * resuelva de forma síncrona internamente.
 */
export interface ScenarioRepository {
  save(id: string, scenario: unknown): Promise<void>;
  findById(id: string): Promise<unknown>;
  findAll(): Promise<readonly unknown[]>;
  remove(id: string): Promise<void>;
}
