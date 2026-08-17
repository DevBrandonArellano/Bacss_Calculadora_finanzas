import { test, expect } from '@playwright/test';

test.describe('Comparador de escenarios', () => {
  test('debe agregar dos escenarios y mostrar la tabla comparativa', async ({ page }) => {
    await page.goto('/');

    const section = page
      .locator('section')
      .filter({ has: page.getByRole('heading', { name: 'Comparador de escenarios' }) });

    await section.getByRole('button', { name: 'Agregar escenario' }).click();
    await section.getByRole('button', { name: 'Agregar escenario' }).click();

    await section.getByLabel('Monto (Escenario A)').fill('10000');
    await section.getByLabel('Tasa anual (Escenario A)').fill('12');
    await section.getByLabel('Plazo (Escenario A)', { exact: true }).fill('12');
    await section.getByLabel('Conversión de tasa (Escenario A)').selectOption('nominal');

    await section.getByLabel('Monto (Escenario B)').fill('10000');
    await section.getByLabel('Tasa anual (Escenario B)').fill('12');
    await section.getByLabel('Plazo (Escenario B)', { exact: true }).fill('24');
    await section.getByLabel('Conversión de tasa (Escenario B)').selectOption('nominal');

    await section.getByRole('button', { name: 'Comparar', exact: true }).click();

    const rows = section.locator('table tbody tr');
    await expect(rows).toHaveCount(2);
    await expect(section.getByRole('cell', { name: 'Escenario A' })).toBeVisible();
    await expect(section.getByRole('cell', { name: 'Escenario B' })).toBeVisible();
  });
});
