export interface ScenarioRepository {
  save(id: string, scenario: unknown): void;
  findById(id: string): unknown;
  findAll(): readonly unknown[];
  remove(id: string): void;
}
