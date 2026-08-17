import { test, expect } from '@playwright/test';

test.describe('¿Abonar deuda o invertir?', () => {
  test('debe mostrar el disclaimer siempre y la recomendación tras comparar', async ({ page }) => {
    await page.goto('/');

    const section = page
      .locator('section')
      .filter({ has: page.getByRole('heading', { name: '¿Abonar deuda o invertir?' }) });

    await expect(
      section.getByText(/el rendimiento de la inversión es una proyección/i),
    ).toBeVisible();

    await section.getByLabel('Dinero disponible').fill('5000');
    await section.getByLabel('Monto del préstamo pendiente').fill('10000');
    await section.getByLabel('Tasa del préstamo (anual %)').fill('12');
    await section.getByLabel('Horizonte (meses)').fill('12');
    await section.getByLabel('Conversión de tasa').selectOption('nominal');
    await section.getByLabel('Rendimiento esperado (anual %)').fill('10');
    await section.getByLabel('Aportes mensuales').fill('100');

    await section.getByRole('button', { name: 'Comparar', exact: true }).click();

    await expect(section.getByText('Ahorro garantizado (abonar)')).toBeVisible();
    await expect(section.getByText('Ganancia esperada (invertir)')).toBeVisible();
    await expect(section.getByText('ROI de la inversión')).toBeVisible();
    await expect(section.getByText('Punto de equilibrio (tasa anual)')).toBeVisible();
    await expect(section.getByText('Recomendación')).toBeVisible();
  });
});
