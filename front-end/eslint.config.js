import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'dev-dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      // eslint-plugin-react-hooks 5.x expõe a config flat como 'recommended-latest'
      // ('configs.flat' só existe a partir da 6.x).
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      // Sem eslint-plugin-react, o core não enxerga uso em JSX: `{ icon: Icon }` usado como
      // <Icon /> parece não utilizado. Por isso nomes em PascalCase são ignorados.
      'no-unused-vars': ['error', {
        varsIgnorePattern: '^[A-Z_]',
        argsIgnorePattern: '^[A-Z_]',
        caughtErrorsIgnorePattern: '^_',
      }],
    },
  },
  {
    // Provider + hook do mesmo contexto ficam juntos de propósito (useAuth, useToast, useConfirm,
    // ThemeContext). O único efeito é o Fast Refresh recarregar a página ao editar esses arquivos.
    files: ['src/context/**/*.{js,jsx}', 'src/hooks/**/*.{js,jsx}'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
  {
    files: ['vite.config.js', 'eslint.config.js'],
    languageOptions: { globals: globals.node },
  },
])
