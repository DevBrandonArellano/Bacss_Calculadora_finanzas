import { describe, it, expect } from 'vitest';
import { CsvExporter } from './csvExporter';
import { FrenchAmortization } from '../../domain/loans/frenchAmortization';
import { Money } from '../../domain/shared/money';
import Decimal from 'decimal.js';
import { Term } from '../../domain/shared/term';

const START_DATE = new Date('2026-01-15T00:00:00.000Z');

describe('CsvExporter', () => {
  it('debe generar un CSV con encabezado y una fila por periodo', async () => {
    const system = new FrenchAmortization();
    const rows = system.generate({
      principal: Money.of('10000', 'USD'),
      monthlyRate: new Decimal('0.01'),
      term: Term.ofMonths(12),
      startDate: START_DATE,
    });

    const exporter = new CsvExporter();
    const csv = await exporter.export(rows);
    const lines = csv.trim().split('\n');

    expect(lines).toHaveLength(13); // encabezado + 12 filas
    expect(lines[0]).toBe('Periodo,Fecha,Cuota,Interes,Capital,Saldo');
    expect(lines[1]).toContain('1,');
    expect(lines[1]).toContain('888.49');
  });

  it('debe generar un CSV vacío (solo encabezado) cuando no hay filas', async () => {
    const exporter = new CsvExporter();
    const csv = await exporter.export([]);
    const lines = csv.trim().split('\n');

    expect(lines).toHaveLength(1);
    expect(lines[0]).toBe('Periodo,Fecha,Cuota,Interes,Capital,Saldo');
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

    const exporter = new CsvExporter();
    const csv = await exporter.export(advancedRows);
    const lines = csv.trim().split('\n');

    expect(lines[0]).toBe('Periodo,Fecha,Cuota,Interes,Capital,Saldo,Abono,CapitalTotal');
  });
});
