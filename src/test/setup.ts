import '@testing-library/jest-dom/vitest';

/** jsdom no implementa ResizeObserver; Recharts (ResponsiveContainer) lo
 * requiere para medir su contenedor. Se reporta un tamaño fijo para que los
 * gráficos rendericen contenido real (paths/ejes) en los tests. */
class ResizeObserverStub implements ResizeObserver {
  private readonly callback: ResizeObserverCallback;

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }

  observe(target: Element): void {
    this.callback(
      [{ target, contentRect: { width: 400, height: 300 } } as unknown as ResizeObserverEntry],
      this,
    );
  }

  unobserve(): void {
    // sin operación: el stub no rastrea observaciones activas
  }

  disconnect(): void {
    // sin operación: el stub no rastrea observaciones activas
  }
}

globalThis.ResizeObserver = ResizeObserverStub;
