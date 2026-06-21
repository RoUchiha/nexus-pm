import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', '.npm-cache/**', '.audit-temp/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}', 'tests/**/*.ts', 'api/**/*.ts'],
    languageOptions: {
      globals: {
        AbortController: 'readonly',
        Blob: 'readonly',
        clearTimeout: 'readonly',
        console: 'readonly',
        crypto: 'readonly',
        document: 'readonly',
        EventSource: 'readonly',
        fetch: 'readonly',
        FileReader: 'readonly',
        Headers: 'readonly',
        localStorage: 'readonly',
        navigator: 'readonly',
        process: 'readonly',
        ReadableStream: 'readonly',
        Request: 'readonly',
        Response: 'readonly',
        sessionStorage: 'readonly',
        setTimeout: 'readonly',
        TextDecoder: 'readonly',
        TextEncoder: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        window: 'readonly',
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // These compiler-oriented rules reject established synchronization patterns that
      // are valid in React 18. Keep the runtime hooks correctness rules enabled.
      'react-hooks/purity': 'off',
      'react-hooks/refs': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
);
