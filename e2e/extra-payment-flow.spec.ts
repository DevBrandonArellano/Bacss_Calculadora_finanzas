import { test, expect } from '@playwright/test';

test.describe('Flujo de abono extraordinario', () => {
  test('debe aplicar un abono, mostrar el ahorro y el gráfico correspondiente', async ({
    page,
  }) => {
    await page.goto('/');

    await page.getByLabel('Monto del préstamo (USD)').fill('10000');
    await page.getByLabel('Tasa anual (%)').fill('12');
    await page.getByLabel('Plazo', { exact: true }).fill('12');
    await page.locator('aside').getByLabel('Conversión de tasa').selectOption('nominal');

    await page.getByRole('button', { name: 'Agregar abono' }).click();
    await page.getByLabel('Período del abono 1').fill('3');
    await page.getByLabel('Monto del abono 1').fill('2000');
    await page.getByLabel('Estrategia de abono').selectOption('reduce-payment');

    await page.getByRole('button', { name: 'Calcular' }).click();

    await expect(page.getByText('Ahorro').first()).toBeVisible();
    await expect(page.getByText('Ahorro generado por abonos')).toBeVisible();

    const highlightedRows = page.locator('table').first().locator('tbody tr.bg-amber-100');
    await expect(highlightedRows).toHaveCount(1);
  });

  test('debe aplicar un aporte recurrente por rango de periodos y reducir la cuota actual', async ({
    page,
  }) => {
    await page.goto('/');

    await page.getByLabel('Monto del préstamo (USD)').fill('10000');
    await page.getByLabel('Tasa anual (%)').fill('12');
    await page.getByLabel('Plazo', { exact: true }).fill('12');
    await page.locator('aside').getByLabel('Conversión de tasa').selectOption('nominal');

    await page.getByRole('button', { name: 'Agregar aporte recurrente' }).click();
    await page.getByLabel('Monto mensual del aporte 1').fill('500');
    await page.getByLabel('Desde el periodo del aporte 1').fill('1');
    await page.getByLabel('Hasta el periodo del aporte 1').fill('6');
    await page.getByLabel('Estrategia de abono').selectOption('reduce-payment');

    await page.getByRole('button', { name: 'Calcular' }).click();

    await expect(page.getByText('Cuota actual')).toBeVisible();
    await expect(page.getByText('Ahorro generado por abonos')).toBeVisible();
    await expect(page.getByText('Reducir plazo vs reducir cuota')).toBeVisible();

    const highlightedRows = page.locator('table').first().locator('tbody tr.bg-amber-100');
    await expect(highlightedRows).toHaveCount(6);
  });
});
