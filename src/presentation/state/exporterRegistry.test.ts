import { describe, it, expect } from 'vitest';
import {
  getCsvExporter,
  getXlsxExporter,
  setCsvExporter,
  setXlsxExporter,
} from './exporterRegistry';
import type { ScheduleExporter, ScheduleRows } from './exporterRegistry';

class FakeExporter implements ScheduleExporter {
  readonly calls: ScheduleRows[] = [];

  export(data: ScheduleRows): Promise<string> {
    this.calls.push(data);
    return Promise.resolve('fake');
  }
}

describe('exporterRegistry', () => {
  it('debe devolver un exportador NoOp por defecto que resuelve string vacío', async () => {
    const result = await getCsvExporter().export([]);
    expect(result).toBe('');
  });

  it('setCsvExporter debe reemplazar el exportador activo de CSV', async () => {
    const fake = new FakeExporter();
    setCsvExporter(fake);

    const result = await getCsvExporter().export([]);

    expect(result).toBe('fake');
  });

  it('setXlsxExporter debe reemplazar el exportador activo de XLSX', async () => {
    const fake = new FakeExporter();
    setXlsxExporter(fake);

    const result = await getXlsxExporter().export([]);

    expect(result).toBe('fake');
  });
});
