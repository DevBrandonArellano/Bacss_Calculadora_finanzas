/**
 * Puerto interno, angosto, para la única tabla que `SupabaseScenarioRepository`
 * necesita. Aísla el adaptador de la forma exacta del query builder de
 * `@supabase/supabase-js` (que es difícil de mockear fielmente porque encadena
 * métodos) y lo hace testeable con un doble de prueba trivial.
 */
export interface ScenarioRow {
  readonly id: string;
  readonly data: unknown;
  readonly updated_at: string;
}

export interface ScenarioTableClient {
  upsert(row: ScenarioRow): Promise<{ error: Error | null }>;
  selectById(id: string): Promise<{ data: ScenarioRow | null; error: Error | null }>;
  selectAll(): Promise<{ data: readonly ScenarioRow[] | null; error: Error | null }>;
  deleteById(id: string): Promise<{ error: Error | null }>;
}
