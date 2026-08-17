import { describe, it, expect, beforeEach } from 'vitest';
import { LocalStorageScenarioRepository } from './localStorageScenarioRepository';

describe('LocalStorageScenarioRepository', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('debe guardar y recuperar un escenario por id', () => {
    const repo = new LocalStorageScenarioRepository();
    const scenario = { label: 'Escenario A', principal: 10000 };

    repo.save('a1', scenario);
    const found = repo.findById('a1');

    expect(found).toEqual(scenario);
  });

  it('debe devolver null cuando el id no existe', () => {
    const repo = new LocalStorageScenarioRepository();
    expect(repo.findById('no-existe')).toBeNull();
  });

  it('debe listar todos los escenarios guardados', () => {
    const repo = new LocalStorageScenarioRepository();
    repo.save('a1', { label: 'A' });
    repo.save('a2', { label: 'B' });

    const all = repo.findAll();
    expect(all).toHaveLength(2);
  });

  it('debe devolver un array vacío cuando no hay escenarios guardados', () => {
    const repo = new LocalStorageScenarioRepository();
    expect(repo.findAll()).toEqual([]);
  });

  it('debe eliminar un escenario por id', () => {
    const repo = new LocalStorageScenarioRepository();
    repo.save('a1', { label: 'A' });

    repo.remove('a1');

    expect(repo.findById('a1')).toBeNull();
    expect(repo.findAll()).toHaveLength(0);
  });

  it('debe sobrescribir un escenario existente al guardar con el mismo id', () => {
    const repo = new LocalStorageScenarioRepository();
    repo.save('a1', { label: 'Original' });
    repo.save('a1', { label: 'Actualizado' });

    expect(repo.findById('a1')).toEqual({ label: 'Actualizado' });
    expect(repo.findAll()).toHaveLength(1);
  });

  it('remove en un id inexistente no debe lanzar error', () => {
    const repo = new LocalStorageScenarioRepository();
    expect(() => {
      repo.remove('no-existe');
    }).not.toThrow();
  });

  it('findAll debe ignorar claves de localStorage que no pertenecen al repositorio', () => {
    localStorage.setItem('otra-app:config', 'algo-no-relacionado');
    const repo = new LocalStorageScenarioRepository();
    repo.save('a1', { label: 'A' });

    const all = repo.findAll();

    expect(all).toHaveLength(1);
    expect(all).toEqual([{ label: 'A' }]);
  });
});
