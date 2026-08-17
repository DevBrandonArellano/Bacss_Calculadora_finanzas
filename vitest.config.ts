import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config.ts';

// Node 22+ expone un `localStorage` global experimental que choca con el de
// jsdom (queda como stub sin métodos como .clear()). Se desactiva vía
// NODE_OPTIONS antes de que Vitest genere sus procesos worker, para que
// jsdom provea la implementación real de Web Storage en los tests.
process.env.NODE_OPTIONS = `${process.env.NODE_OPTIONS ?? ''} --no-webstorage`.trim();

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/test/setup.ts'],
      exclude: ['e2e/**', 'node_modules/**'],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'html', 'lcov'],
        include: [
          'src/domain/shared/**/*.ts',
          'src/domain/loans/**/*.ts',
          'src/domain/investments/**/*.ts',
          'src/application/**/*.ts',
          'src/infrastructure/**/*.ts',
          'src/presentation/**/*.{ts,tsx}',
        ],
        exclude: [
          'src/domain/shared/**/*.test.ts',
          'src/domain/shared/index.ts',
          'src/domain/loans/**/*.test.ts',
          'src/domain/loans/index.ts',
          'src/domain/loans/amortizationRow.ts',
          'src/domain/loans/amortizationSystem.ts',
          'src/domain/loans/extra-payments/index.ts',
          'src/domain/loans/extra-payments/extraPaymentStrategy.ts',
          'src/domain/loans/extra-payments/advancedAmortizationRow.ts',
          'src/domain/investments/**/*.test.ts',
          'src/domain/investments/index.ts',
          'src/domain/investments/scenario.ts',
          'src/application/**/*.test.ts',
          'src/application/index.ts',
          'src/application/ports/**',
          'src/application/use-cases/index.ts',
          'src/infrastructure/**/*.test.ts',
          'src/infrastructure/index.ts',
          'src/infrastructure/logging/index.ts',
          'src/infrastructure/export/index.ts',
          'src/infrastructure/persistence/index.ts',
          'src/presentation/**/*.test.{ts,tsx}',
          'src/presentation/index.ts',
        ],
        thresholds: {
          'src/domain/shared/**/*.ts': {
            statements: 95,
            branches: 95,
            functions: 95,
            lines: 95,
          },
          'src/domain/loans/**/*.ts': {
            statements: 90,
            branches: 90,
            functions: 90,
            lines: 90,
          },
          'src/domain/investments/**/*.ts': {
            statements: 90,
            branches: 90,
            functions: 90,
            lines: 90,
          },
          'src/application/use-cases/**/*.ts': {
            statements: 90,
            branches: 90,
            functions: 90,
            lines: 90,
          },
          'src/infrastructure/logging/**/*.ts': {
            statements: 90,
            branches: 90,
            functions: 90,
            lines: 90,
          },
          'src/infrastructure/persistence/**/*.ts': {
            statements: 90,
            branches: 90,
            functions: 90,
            lines: 90,
          },
          'src/infrastructure/export/**/*.ts': {
            statements: 90,
            branches: 90,
            functions: 90,
            lines: 90,
          },
          'src/presentation/**/*.{ts,tsx}': {
            statements: 80,
            branches: 75,
            functions: 80,
            lines: 80,
          },
        },
      },
    },
  }),
);
