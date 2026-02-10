import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  eslintConfigPrettier,
  {
    ignores: ['dist/', 'node_modules/', 'coverage/', 'tests/'],
  },
  {
    files: ['src/**/*.ts'],
    rules: {
      // This project uses chalk for all console output — no-console must be off
      'no-console': 'off',

      // Warn on unused vars but allow underscore-prefixed params
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],

      // Warn on explicit any — project uses some intentionally
      '@typescript-eslint/no-explicit-any': 'warn',

      // Require consistent return statements
      'consistent-return': 'off', // Disabled — TypeScript handles this via noImplicitReturns

      // Allow non-null assertions (project convention: resolver!.method())
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
);
