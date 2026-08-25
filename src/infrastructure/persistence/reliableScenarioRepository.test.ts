import { describe, it, expect, vi } from 'vitest';
import { ReliableScenarioRepository } from './reliableScenarioRepository';
import type { ScenarioRepository } from '../../application/ports/scenarioRepository';

function fakeRepository(overrides: Partial<ScenarioRepository> = {}): ScenarioRepository {
  return {
    save: vi.fn().mockResolvedValue(undefined),
    findById: vi.fn().mockResolvedValue(null),
    findAll: vi.fn().mockResolvedValue([]),
    remove: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('ReliableScenarioRepository', () => {
  it('save() usa el remoto y espeja en local cuando el remoto funciona', async () => {
    const remoteSave = vi.fn().mockResolvedValue(undefined);
    const localSave = vi.fn().mockResolvedValue(undefined);
    const repo = new ReliableScenarioRepository(
      fakeRepository({ save: remoteSave }),
      fakeRepository({ save: localSave }),
    );

    await repo.save('a1', { label: 'A' });

    expect(remoteSave).toHaveBeenCalledWith('a1', { label: 'A' });
    expect(localSave).toHaveBeenCalledWith('a1', { label: 'A' });
  });

  it('save() reporta estado "synced" cuando el remoto funciona', async () => {
    const onSyncStatusChange = vi.fn();
    const repo = new ReliableScenarioRepository(fakeRepository(), fakeRepository(), {
      onSyncStatusChange,
    });

    await repo.save('a1', { label: 'A' });

    expect(onSyncStatusChange).toHaveBeenCalledWith('synced');
  });

  it('save() jamás lanza cuando el remoto falla — cae a local silenciosamente', async () => {
    const localSave = vi.fn().mockResolvedValue(undefined);
    const repo = new ReliableScenarioRepository(
      fakeRepository({ save: vi.fn().mockRejectedValue(new Error('sin red')) }),
      fakeRepository({ save: localSave }),
    );

    await expect(repo.save('a1', { label: 'A' })).resolves.toBeUndefined();
    expect(localSave).toHaveBeenCalledWith('a1', { label: 'A' });
  });

  it('save() reporta estado "offline" cuando el remoto falla', async () => {
    const onSyncStatusChange = vi.fn();
    const remote = fakeRepository({ save: vi.fn().mockRejectedValue(new Error('sin red')) });
    const repo = new ReliableScenarioRepository(remote, fakeRepository(), { onSyncStatusChange });

    await repo.save('a1', { label: 'A' });

    expect(onSyncStatusChange).toHaveBeenCalledWith('offline');
  });

  it('findAll() devuelve los datos del remoto cuando funciona', async () => {
    const remote = fakeRepository({ findAll: vi.fn().mockResolvedValue([{ label: 'A' }]) });
    const repo = new ReliableScenarioRepository(remote, fakeRepository());

    expect(await repo.findAll()).toEqual([{ label: 'A' }]);
  });

  it('findAll() cae a los datos locales cuando el remoto falla, sin lanzar', async () => {
    const remote = fakeRepository({ findAll: vi.fn().mockRejectedValue(new Error('timeout')) });
    const local = fakeRepository({ findAll: vi.fn().mockResolvedValue([{ label: 'local' }]) });
    const repo = new ReliableScenarioRepository(remote, local);

    await expect(repo.findAll()).resolves.toEqual([{ label: 'local' }]);
  });

  it('remove() siempre elimina localmente aunque el remoto falle, sin lanzar', async () => {
    const localRemove = vi.fn().mockResolvedValue(undefined);
    const repo = new ReliableScenarioRepository(
      fakeRepository({ remove: vi.fn().mockRejectedValue(new Error('sin red')) }),
      fakeRepository({ remove: localRemove }),
    );

    await expect(repo.remove('a1')).resolves.toBeUndefined();
    expect(localRemove).toHaveBeenCalledWith('a1');
  });
});
