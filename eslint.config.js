import js from '@eslint/js';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactHooks from 'eslint-plugin-react-hooks';
import { reactRefresh } from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'dev-dist', 'coverage', 'playwright-report', 'test-results'] },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite(),
      jsxA11y.flatConfigs.recommended,
    ],
    languageOptions: {
      ecmaVersion: 2023,
      globals: globals.browser,
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    // Domain logic is plain TypeScript: no React, no UI, no storage engine and no
    // ambient clock. Time always arrives as a parameter, so every rule about
    // reminders, workdays and day rollover can be tested deterministically.
    files: ['src/features/*/domain/**/*.ts', 'src/lib/dates.ts'],
    ignores: ['**/*.test.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'react', message: 'Domain code must not depend on React.' },
            { name: 'dexie', message: 'Domain code must not depend on the storage engine.' },
          ],
          patterns: [{ group: ['@/ui/*', '**/ui/*'], message: 'Domain code must not import UI.' }],
        },
      ],
      'no-restricted-properties': [
        'error',
        { object: 'Date', property: 'now', message: 'Receive the current time as a parameter.' },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: "NewExpression[callee.name='Date'][arguments.length=0]",
          message: 'Receive the current time as a parameter.',
        },
      ],
    },
  },
  {
    // Test helpers export functions next to components; fast refresh is irrelevant there.
    files: ['src/test/**', '**/*.test.{ts,tsx}'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
  {
    files: ['src/sw.ts'],
    languageOptions: { globals: globals.serviceworker },
  },
  {
    // End-to-end tests are Playwright scripts, not React code.
    files: ['e2e/**/*.ts'],
    rules: { 'react-hooks/rules-of-hooks': 'off' },
  },
  {
    files: ['*.config.{js,ts}', 'scripts/**/*.mjs'],
    extends: [js.configs.recommended],
    // Node scripts. The capture script also passes functions to run inside the page.
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
);
