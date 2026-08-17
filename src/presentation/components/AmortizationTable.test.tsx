import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AmortizationTable } from './AmortizationTable';
import { FrenchAmortization } from '../../domain/loans/frenchAmortization';
import { Money } from '../../domain/shared/money';
import Decimal from 'decimal.js';
import { Term } from '../../domain/shared/term';
import { setCsvExporter, setXlsxExporter } from '../state/exporterRegistry';
import type { ScheduleRows } from '../state/exporterRegistry';

const START_DATE = new Date('2026-01-15T00:00:00.000Z');

describe('AmortizationTable', () => {
  it('debe renderizar una fila por cada periodo del schedule', () => {
    const system = new FrenchAmortization();
    const rows = system.generate({
      principal: Money.of('10000', 'USD'),
      monthlyRate: new Decimal('0.01'),
      term: Term.ofMonths(12),
      startDate: START_DATE,
    });

    render(<AmortizationTable rows={rows} />);

    const dataRows = screen.getAllByRole('row').slice(1); // excluye encabezado
    expect(dataRows).toHaveLength(12);
  });

  it('debe mostrar un mensaje cuando no hay filas', () => {
    render(<AmortizationTable rows={[]} />);
    expect(screen.getByText(/sin datos/i)).toBeInTheDocument();
  });

  it('debe resaltar visualmente las filas con abono cuando son AdvancedAmortizationRow', () => {
    const system = new FrenchAmortization();
    const baseRows = system.generate({
      principal: Money.of('1000', 'USD'),
      monthlyRate: new Decimal('0.01'),
      term: Term.ofMonths(2),
      startDate: START_DATE,
    });
    const advancedRows = baseRows.map((row, index) => ({
      ...row,
      extraPayment: index === 0 ? Money.of('100', 'USD') : Money.zero('USD'),
      totalPrincipalPaid: row.principalPaid,
    }));

    render(<AmortizationTable rows={advancedRows} />);

    const dataRows = screen.getAllByRole('row').slice(1);
    expect(dataRows[0]?.className).toContain('bg-amber-100');
    expect(dataRows[1]?.className).not.toContain('bg-amber-100');
  });

  describe('exportación', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('debe llamar al exportador CSV y disparar la descarga al hacer click en "Exportar CSV"', async () => {
      const system = new FrenchAmortization();
      const rows = system.generate({
        principal: Money.of('1000', 'USD'),
        monthlyRate: new Decimal('0.01'),
        term: Term.ofMonths(2),
        startDate: START_DATE,
      });

      const exportMock = vi.fn((data: ScheduleRows) =>
        Promise.resolve(`csv:${String(data.length)}`),
      );
      setCsvExporter({ export: exportMock });

      const createObjectURLMock = vi.fn().mockReturnValue('blob:fake-url');
      const revokeObjectURLMock = vi.fn();
      vi.stubGlobal('URL', {
        ...URL,
        createObjectURL: createObjectURLMock,
        revokeObjectURL: revokeObjectURLMock,
      });
      const clickSpy = vi
        .spyOn(HTMLAnchorElement.prototype, 'click')
        .mockImplementation(() => undefined);

      render(<AmortizationTable rows={rows} />);
      fireEvent.click(screen.getByRole('button', { name: /exportar csv/i }));

      await waitFor(() => {
        expect(exportMock).toHaveBeenCalledWith(rows);
      });
      expect(createObjectURLMock).toHaveBeenCalled();
      expect(clickSpy).toHaveBeenCalled();
    });

    it('debe llamar al exportador XLSX y disparar la descarga al hacer click en "Exportar XLSX"', async () => {
      const system = new FrenchAmortization();
      const rows = system.generate({
        principal: Money.of('1000', 'USD'),
        monthlyRate: new Decimal('0.01'),
        term: Term.ofMonths(2),
        startDate: START_DATE,
      });

      const exportMock = vi.fn(() => Promise.resolve(new Uint8Array([1, 2, 3])));
      setXlsxExporter({ export: exportMock });

      vi.stubGlobal('URL', {
        ...URL,
        createObjectURL: vi.fn().mockReturnValue('blob:fake-url'),
        revokeObjectURL: vi.fn(),
      });
      const clickSpy = vi
        .spyOn(HTMLAnchorElement.prototype, 'click')
        .mockImplementation(() => undefined);

      render(<AmortizationTable rows={rows} />);
      fireEvent.click(screen.getByRole('button', { name: /exportar xlsx/i }));

      await waitFor(() => {
        expect(exportMock).toHaveBeenCalledWith(rows);
      });
      expect(clickSpy).toHaveBeenCalled();
    });
  });
});
