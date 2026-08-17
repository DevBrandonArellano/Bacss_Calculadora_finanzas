import { test, expect } from '@playwright/test';

async function calculateBasicLoan(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.getByLabel('Monto del préstamo (USD)').fill('10000');
  await page.getByLabel('Tasa anual (%)').fill('12');
  await page.getByLabel('Plazo', { exact: true }).fill('12');
  await page.locator('aside').getByLabel('Conversión de tasa').selectOption('nominal');
  await page.getByRole('button', { name: 'Calcular' }).click();
  await expect(page.getByText('Capital').first()).toBeVisible();
}

test.describe('Exportación de la tabla de amortización', () => {
  test('debe descargar un archivo CSV al hacer click en "Exportar CSV"', async ({ page }) => {
    await calculateBasicLoan(page);

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Exportar CSV' }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe('amortizacion.csv');
  });

  test('debe descargar un archivo XLSX al hacer click en "Exportar XLSX"', async ({ page }) => {
    await calculateBasicLoan(page);

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Exportar XLSX' }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe('amortizacion.xlsx');
  });
});
