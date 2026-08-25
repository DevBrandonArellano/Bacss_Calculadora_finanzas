import { describe, it, expect, beforeEach } from 'vitest';
import { LocalStorageScenarioRepository } from './localStorageScenarioRepository';

describe('LocalStorageScenarioRepository', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('expone una API asíncrona (Promise-based) en los cuatro métodos', () => {
    const repo = new LocalStorageScenarioRepository();

    expect(repo.save('a1', { label: 'A' })).toBeInstanceOf(Promise);
    expect(repo.findById('a1')).toBeInstanceOf(Promise);
    expect(repo.findAll()).toBeInstanceOf(Promise);
    expect(repo.remove('a1')).toBeInstanceOf(Promise);
  });

  it('debe guardar y recuperar un escenario por id', async () => {
    const repo = new LocalStorageScenarioRepository();
    const scenario = { label: 'Escenario A', principal: 10000 };

    await repo.save('a1', scenario);
    const found = await repo.findById('a1');

    expect(found).toEqual(scenario);
  });

  it('debe devolver null cuando el id no existe', async () => {
    const repo = new LocalStorageScenarioRepository();
    expect(await repo.findById('no-existe')).toBeNull();
  });

  it('debe listar todos los escenarios guardados', async () => {
    const repo = new LocalStorageScenarioRepository();
    await repo.save('a1', { label: 'A' });
    await repo.save('a2', { label: 'B' });

    const all = await repo.findAll();
    expect(all).toHaveLength(2);
  });

  it('debe devolver un array vacío cuando no hay escenarios guardados', async () => {
    const repo = new LocalStorageScenarioRepository();
    expect(await repo.findAll()).toEqual([]);
  });

  it('debe eliminar un escenario por id', async () => {
    const repo = new LocalStorageScenarioRepository();
    await repo.save('a1', { label: 'A' });

    await repo.remove('a1');

    expect(await repo.findById('a1')).toBeNull();
    expect(await repo.findAll()).toHaveLength(0);
  });

  it('debe sobrescribir un escenario existente al guardar con el mismo id', async () => {
    const repo = new LocalStorageScenarioRepository();
    await repo.save('a1', { label: 'Original' });
    await repo.save('a1', { label: 'Actualizado' });

    expect(await repo.findById('a1')).toEqual({ label: 'Actualizado' });
    expect(await repo.findAll()).toHaveLength(1);
  });

  it('remove en un id inexistente no debe lanzar error', async () => {
    const repo = new LocalStorageScenarioRepository();
    await expect(repo.remove('no-existe')).resolves.not.toThrow();
  });

  it('findAll debe ignorar claves de localStorage que no pertenecen al repositorio', async () => {
    localStorage.setItem('otra-app:config', 'algo-no-relacionado');
    const repo = new LocalStorageScenarioRepository();
    await repo.save('a1', { label: 'A' });

    const all = await repo.findAll();

    expect(all).toHaveLength(1);
    expect(all).toEqual([{ label: 'A' }]);
  });
});
