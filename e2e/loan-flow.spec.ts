import { test, expect } from '@playwright/test';

test.describe('Flujo de préstamo básico', () => {
  test('debe calcular un préstamo francés y mostrar dashboard y tabla', async ({ page }) => {
    await page.goto('/');

    await page.getByLabel('Monto del préstamo (USD)').fill('10000');
    await page.getByLabel('Tasa anual (%)').fill('12');
    await page.getByLabel('Plazo', { exact: true }).fill('12');
    await page.locator('aside').getByLabel('Conversión de tasa').selectOption('nominal');
    await page.getByRole('button', { name: 'Calcular' }).click();

    await expect(page.getByText('Capital').first()).toBeVisible();
    await expect(page.getByText('Interés total').first()).toBeVisible();
    await expect(page.getByText('888.49').first()).toBeVisible();

    const rows = page.locator('table').first().locator('tbody tr');
    await expect(rows).toHaveCount(12);
  });

  test('debe mostrar un error de dominio traducido con datos inválidos', async ({ page }) => {
    await page.goto('/');

    await page.getByLabel('Monto del préstamo (USD)').fill('0');
    await page.getByLabel('Tasa anual (%)').fill('12');
    await page.getByLabel('Plazo', { exact: true }).fill('12');
    await page.locator('aside').getByLabel('Conversión de tasa').selectOption('nominal');
    await page.getByRole('button', { name: 'Calcular' }).click();

    await expect(page.getByRole('alert')).toBeVisible();
  });
});
