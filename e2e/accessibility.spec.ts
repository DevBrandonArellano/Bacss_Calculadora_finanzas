import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accesibilidad', () => {
  test('la página inicial no debe tener violaciones críticas ni serias de WCAG', async ({
    page,
  }) => {
    await page.goto('/');

    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();

    const seriousOrWorse = results.violations.filter(
      (violation) => violation.impact === 'critical' || violation.impact === 'serious',
    );

    expect(seriousOrWorse, JSON.stringify(seriousOrWorse, null, 2)).toEqual([]);
  });

  test('la página con préstamo calculado (dashboard, tabla y gráficos) no debe tener violaciones críticas ni serias', async ({
    page,
  }) => {
    await page.goto('/');
    await page.getByLabel('Monto del préstamo (USD)').fill('10000');
    await page.getByLabel('Tasa anual (%)').fill('12');
    await page.getByLabel('Plazo', { exact: true }).fill('12');
    await page.locator('aside').getByLabel('Conversión de tasa').selectOption('nominal');
    await page.getByRole('button', { name: 'Calcular' }).click();
    await expect(page.getByText('Capital').first()).toBeVisible();

    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();

    const seriousOrWorse = results.violations.filter(
      (violation) => violation.impact === 'critical' || violation.impact === 'serious',
    );

    expect(seriousOrWorse, JSON.stringify(seriousOrWorse, null, 2)).toEqual([]);
  });

  test('debe permitir calcular el préstamo usando solo el teclado', async ({ page }) => {
    await page.goto('/');

    await page.getByLabel('Monto del préstamo (USD)').click();
    await page.keyboard.type('10000');
    await page.keyboard.press('Tab');
    await page.keyboard.type('12');

    await page.getByLabel('Plazo', { exact: true }).fill('12');
    await page.locator('aside').getByLabel('Conversión de tasa').selectOption('nominal');

    await page.getByRole('button', { name: 'Calcular' }).focus();
    await page.keyboard.press('Enter');

    await expect(page.getByText('Capital').first()).toBeVisible();
  });
});
