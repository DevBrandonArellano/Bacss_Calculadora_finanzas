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
      'boundaries/elements': [
        { type: 'composition-root', pattern: 'src/main.tsx', partialMatch: false },
        { type: 'domain', pattern: 'src/domain/**' },
        { type: 'application', pattern: 'src/application/**' },
        { type: 'infrastructure', pattern: 'src/infrastructure/**' },
        { type: 'presentation', pattern: 'src/presentation/**' },
      ],
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

      // Conflicto con no-non-null-assertion (que preferimos mantener activo): esta regla
      // pide usar "!" en vez de "as T" para descartar null/undefined ya probados en runtime,
      // pero el proyecto prohíbe "!" explícitamente. Se prioriza no-non-null-assertion.
      '@typescript-eslint/non-nullable-type-assertion-style': 'off',

      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          policies: [
            {
              from: [{ type: 'domain' }],
              allow: [],
            },
            {
              from: [{ type: 'application' }],
              allow: [{ type: 'domain' }],
            },
            {
              from: [{ type: 'infrastructure' }],
              allow: [{ type: 'domain' }, { type: 'application' }],
            },
            {
              from: [{ type: 'presentation' }],
              allow: [{ type: 'domain' }, { type: 'application' }],
            },
            {
              from: [{ type: 'composition-root' }],
              allow: [
                { type: 'domain' },
                { type: 'application' },
                { type: 'infrastructure' },
                { type: 'presentation' },
              ],
            },
          ],
        },
      ],

      // default: 'allow' — solo domain/application quedan restringidos explícitamente
      // abajo. infrastructure/presentation/composition-root no tienen restricción de
      // paquetes externos (ver Fase 0), y el string comodín '*' de este plugin no
      // resuelve correctamente paquetes con scope (ej. @testing-library/react), así
      // que se usa el 'default' de la regla en vez de listar '*' por tipo.
      'boundaries/external': [
        'error',
        {
          default: 'allow',
          policies: [
            {
              from: [{ type: 'domain' }],
              allow: ['decimal.js', 'date-fns', 'vitest'],
            },
            {
              from: [{ type: 'application' }],
              allow: ['decimal.js', 'date-fns', 'vitest'],
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
