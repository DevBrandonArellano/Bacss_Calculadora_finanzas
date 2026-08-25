import type { ScenarioRepository } from '../../application/ports/scenarioRepository';

export type ScenarioSyncStatus = 'synced' | 'offline';

export interface ReliableScenarioRepositoryOptions {
  readonly onSyncStatusChange?: (status: ScenarioSyncStatus) => void;
}

/**
 * Decorator de fiabilidad (ISO 25010): envuelve un repositorio remoto y uno
 * local. Si el remoto falla o no está disponible, cae a local sin romper la
 * app — nunca lanza. `local` también actúa como espejo de todo lo que se
 * guarda con éxito en remoto, para que quede disponible offline.
 */
export class ReliableScenarioRepository implements ScenarioRepository {
  private readonly remote: ScenarioRepository;
  private readonly local: ScenarioRepository;
  private readonly options: ReliableScenarioRepositoryOptions;

  constructor(
    remote: ScenarioRepository,
    local: ScenarioRepository,
    options: ReliableScenarioRepositoryOptions = {},
  ) {
    this.remote = remote;
    this.local = local;
    this.options = options;
  }

  private reportStatus(status: ScenarioSyncStatus): void {
    this.options.onSyncStatusChange?.(status);
  }

  async save(id: string, scenario: unknown): Promise<void> {
    try {
      await this.remote.save(id, scenario);
      await this.local.save(id, scenario);
      this.reportStatus('synced');
    } catch {
      await this.local.save(id, scenario);
      this.reportStatus('offline');
    }
  }

  async findById(id: string): Promise<unknown> {
    try {
      const result = await this.remote.findById(id);
      this.reportStatus('synced');
      return result;
    } catch {
      this.reportStatus('offline');
      return this.local.findById(id);
    }
  }

  async findAll(): Promise<readonly unknown[]> {
    try {
      const result = await this.remote.findAll();
      this.reportStatus('synced');
      return result;
    } catch {
      this.reportStatus('offline');
      return this.local.findAll();
    }
  }

  async remove(id: string): Promise<void> {
    try {
      await this.remote.remove(id);
      this.reportStatus('synced');
    } catch {
      this.reportStatus('offline');
    } finally {
      await this.local.remove(id);
    }
  }
}
