import type { ScenarioRepository } from '../../application/ports/scenarioRepository';

const STORAGE_PREFIX = 'calculadora-finanzas:scenario:';

export class LocalStorageScenarioRepository implements ScenarioRepository {
  save(id: string, scenario: unknown): void {
    localStorage.setItem(STORAGE_PREFIX + id, JSON.stringify(scenario));
  }

  findById(id: string): unknown {
    const raw = localStorage.getItem(STORAGE_PREFIX + id);
    return raw === null ? null : (JSON.parse(raw) as unknown);
  }

  findAll(): readonly unknown[] {
    const results: unknown[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(STORAGE_PREFIX) === true) {
        // Invariante: key proviene de localStorage.key(i), por lo que la entrada
        // existe en ese momento — getItem(key) no puede devolver null aquí.
        const raw = localStorage.getItem(key) as string;
        results.push(JSON.parse(raw) as unknown);
      }
    }
    return results;
  }

  remove(id: string): void {
    localStorage.removeItem(STORAGE_PREFIX + id);
  }
}
