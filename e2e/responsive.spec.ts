import { test, expect } from '@playwright/test';

test.describe('Responsive', () => {
  test('en laptop (1280px) el formulario y el contenido principal deben mostrarse lado a lado', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');

    const asideBox = await page.locator('aside').boundingBox();
    const mainBox = await page.locator('main').boundingBox();

    expect(asideBox).not.toBeNull();
    expect(mainBox).not.toBeNull();
    // Lado a lado: el main empieza a la derecha del aside, no debajo.
    expect(mainBox!.x).toBeGreaterThan(asideBox!.x + asideBox!.width - 1);
    expect(Math.abs(mainBox!.y - asideBox!.y)).toBeLessThan(10);
  });

  test('en tablet (768px) el formulario y el contenido principal deben apilarse verticalmente', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');

    const asideBox = await page.locator('aside').boundingBox();
    const mainBox = await page.locator('main').boundingBox();

    expect(asideBox).not.toBeNull();
    expect(mainBox).not.toBeNull();
    // Apilado: el main empieza debajo del aside, no a su derecha.
    expect(mainBox!.y).toBeGreaterThan(asideBox!.y + asideBox!.height - 1);

    await expect(page.getByRole('heading', { name: 'Datos del préstamo' })).toBeVisible();
  });

  test('en tablet no debe haber scroll horizontal en la página', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );

    expect(hasHorizontalOverflow).toBe(false);
  });
});
