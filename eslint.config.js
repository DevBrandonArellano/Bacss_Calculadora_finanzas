import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import boundaries from 'eslint-plugin-boundaries';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: [
      'dist',
      'coverage',
      'playwright-report',
      'test-results',
      'e2e/**',
      'eslint.config.js',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.app.json', './tsconfig.node.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh, boundaries },
    settings: {
      // Sin este resolver, boundaries no resuelve los imports de TypeScript
      // (que van sin extensión), los clasifica como `unknown` y las políticas
      // de capas quedan inertes: nunca reportarían una violación.
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
          project: ['./tsconfig.app.json', './tsconfig.node.json'],
          // El proyecto usa dos tsconfig a propósito (app y node); no es un aviso accionable.
          noWarnOnMultipleProjects: true,
        },
      },
      'boundaries/elements': [
        { type: 'domain', pattern: 'src/domain/**' },
        { type: 'application', pattern: 'src/application/**' },
        { type: 'infrastructure', pattern: 'src/infrastructure/**' },
        { type: 'presentation', pattern: 'src/presentation/**' },
      ],
      // `main.tsx` es un archivo suelto, no una carpeta: se clasifica como
      // categoría de archivo (los `elements` describen carpetas, no archivos).
      'boundaries/files': [{ pattern: 'src/main.tsx', category: 'composition-root' }],
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

      // Conflicto con no-non-null-assertion (que preferimos mantener activo): esta regla
      // pide usar "!" en vez de "as T" para descartar null/undefined ya probados en runtime,
      // pero el proyecto prohíbe "!" explícitamente. Se prioriza no-non-null-assertion.
      '@typescript-eslint/non-nullable-type-assertion-style': 'off',

      // Una sola regla cubre dependencias locales y externas: `boundaries/external`
      // quedó obsoleta en v7 en favor de `checkAllOrigins` + selector `module`.
      // Las políticas se evalúan en orden y la última que coincide gana, así que
      // las más específicas van al final.
      'boundaries/dependencies': [
        'error',
        {
          checkAllOrigins: true,
          default: 'disallow',
          policies: [
            // Paquetes externos y builtins de Node: permitidos por defecto en
            // todas las capas; domain/application se restringen más abajo.
            { allow: { to: { module: { origin: ['external', 'core'] } } } },

            // domain no tiene política local: el `default: 'disallow'` lo deja
            // sin permiso para importar ninguna otra capa.
            {
              from: { element: { type: 'application' } },
              allow: { to: { element: { type: 'domain' } } },
            },
            {
              from: { element: { type: 'infrastructure' } },
              allow: { to: { element: { types: { anyOf: ['domain', 'application'] } } } },
            },
            {
              from: { element: { type: 'presentation' } },
              allow: { to: { element: { types: { anyOf: ['domain', 'application'] } } } },
            },
            {
              from: { file: { categories: 'composition-root' } },
              allow: {
                to: {
                  element: {
                    types: {
                      anyOf: ['domain', 'application', 'infrastructure', 'presentation'],
                    },
                  },
                },
              },
            },

            // domain y application solo pueden usar estos paquetes externos
            // (ver Fase 0): se les niega todo y se les vuelve a permitir la lista.
            {
              from: { element: { types: { anyOf: ['domain', 'application'] } } },
              disallow: { to: { module: { origin: ['external', 'core'] } } },
            },
            {
              from: { element: { types: { anyOf: ['domain', 'application'] } } },
              allow: {
                to: {
                  module: {
                    origin: ['external', 'core'],
                    source: ['decimal.js', 'date-fns', 'vitest'],
                  },
                },
              },
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/domain/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'react', message: 'El dominio no puede depender de React.' },
            { name: 'react-dom', message: 'El dominio no puede depender de react-dom.' },
            { name: 'zustand', message: 'El dominio no puede depender de Zustand.' },
            { name: 'recharts', message: 'El dominio no puede depender de Recharts.' },
          ],
          patterns: [
            {
              group: ['react/*', 'react-dom/*'],
              message: 'El dominio no puede depender de React.',
            },
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        'window',
        'document',
        'navigator',
        'localStorage',
        'sessionStorage',
        'fetch',
        'alert',
        'confirm',
      ],
    },
  },
  prettier,
);
