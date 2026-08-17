import { describe, it, expect } from 'vitest';
import ExcelJS from 'exceljs';
import { XlsxExporter } from './xlsxExporter';
import { FrenchAmortization } from '../../domain/loans/frenchAmortization';
import { Money } from '../../domain/shared/money';
import Decimal from 'decimal.js';
import { Term } from '../../domain/shared/term';

const START_DATE = new Date('2026-01-15T00:00:00.000Z');

describe('XlsxExporter', () => {
  it('debe generar un buffer XLSX válido con encabezado y filas correctas', async () => {
    const system = new FrenchAmortization();
    const rows = system.generate({
      principal: Money.of('10000', 'USD'),
      monthlyRate: new Decimal('0.01'),
      term: Term.ofMonths(12),
      startDate: START_DATE,
    });

    const exporter = new XlsxExporter();
    const buffer = await exporter.export(rows);

    expect(buffer.length).toBeGreaterThan(0);

    // Verificación estructural real: parsear el buffer generado y confirmar celdas.
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer.buffer as ArrayBuffer);
    const worksheet = workbook.worksheets[0];

    expect(worksheet).toBeDefined();
    const headerRow = worksheet?.getRow(1).values as unknown[];
    expect(headerRow).toContain('Periodo');
    expect(headerRow).toContain('Cuota');

    const firstDataRow = worksheet?.getRow(2).values as unknown[];
    expect(firstDataRow).toContain(1);

    expect(worksheet?.rowCount).toBe(13); // encabezado + 12 filas
  });

  it('debe generar un libro con solo encabezado cuando no hay filas', async () => {
    const exporter = new XlsxExporter();
    const buffer = await exporter.export([]);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer.buffer as ArrayBuffer);
    const worksheet = workbook.worksheets[0];

    expect(worksheet?.rowCount).toBe(1);
  });

  it('debe incluir columnas de Abono y CapitalTotal cuando las filas son AdvancedAmortizationRow', async () => {
    const system = new FrenchAmortization();
    const baseRows = system.generate({
      principal: Money.of('1000', 'USD'),
      monthlyRate: new Decimal('0.01'),
      term: Term.ofMonths(2),
      startDate: START_DATE,
    });
    const advancedRows = baseRows.map((row) => ({
      ...row,
      extraPayment: Money.zero('USD'),
      totalPrincipalPaid: row.principalPaid,
    }));

    const exporter = new XlsxExporter();
    const buffer = await exporter.export(advancedRows);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer.buffer as ArrayBuffer);
    const worksheet = workbook.worksheets[0];
    const headerRow = worksheet?.getRow(1).values as unknown[];

    expect(headerRow).toContain('Abono');
    expect(headerRow).toContain('CapitalTotal');
  });
});
