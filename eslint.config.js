import eslint from '@eslint/js';

export default [
  { ignores: ['dist/**', 'public/data/age/**', 'public/assets/covers/**', 'node_modules/**', 'playwright-report/**', 'test-results/**', 'src/**/*.ts', 'src/**/*.tsx'] },
  eslint.configs.recommended,
  { languageOptions: { globals: Object.fromEntries(['URL', 'process', 'console', 'fetch', 'Response', 'Request', 'Buffer', 'AbortController', 'setTimeout', 'clearTimeout', 'document', 'window'].map((name) => [name, 'readonly'])) }, rules: { 'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }], 'no-useless-escape': 'off', 'no-irregular-whitespace': 'off' } },
];
