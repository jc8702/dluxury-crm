import js from '@eslint/js';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default tseslint.config(
  // Ignorar node_modules e build
  {
    ignores: [
      'node_modules/',
      'dist/',
      'build/',
      'coverage/',
      'scratch/',
      'scripts/',
      '.vercel/',
      'playwright-report/',
      'test-results/',
      'dev-api-server.js',
      'run-migrations.js',
      'test-direct.js',
      'sync-db.ts',
    ],
  },

  // Configuração base JS
  js.configs.recommended,

  // Configurações TypeScript
  ...tseslint.configs.recommended,

  // Arquivos React e TSX
  {
    files: ['**/*.{jsx,tsx}'],
    plugins: {
      react,
      'react-hooks': reactHooks,
    },
    languageOptions: {
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2021,
      },
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'react/no-unknown-property': [
        'error',
        {
          ignore: [
            'position',
            'args',
            'attach',
            'count',
            'array',
            'itemSize',
            'transparent',
            'opacity',
            'emissive',
            'emissiveIntensity',
            'roughness',
            'metalness',
            'depthWrite',
            'renderOrder',
            'linewidth',
            'rotation',
            'side',
            'image',
            'colorSpace',
            'minFilter',
            'magFilter',
            'geometry',
            'material',
            'scale',
            'castShadow',
            'receiveShadow',
            'intensity',
            'distance',
          ],
        },
      ],
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // Regras de qualidade
      'no-unused-vars': 'off', // Desligado pois usamos a regra do typescript-eslint
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      'react/no-unescaped-entities': 'off',
      'prefer-const': 'warn',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'always'],

      // Nomenclatura
      camelcase: 'off',
    },
  },
  // Arquivos TypeScript (não JSX)
  {
    files: ['**/*.ts'],
    plugins: {
      react,
      'react-hooks': reactHooks,
    },
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser,
        ...globals.es2021,
      },
    },
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      'prefer-const': 'warn',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'always'],
      camelcase: 'off',
    },
  },
  // Arquivos JavaScript (scripts Node, configs, etc.) — Node globals ativos
  {
    files: ['**/*.js', '**/*.mjs', '**/*.cjs'],
    languageOptions: {
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.es2021,
      },
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      'no-console': 'off',
      'prefer-const': 'warn',
      eqeqeq: ['error', 'always'],
      camelcase: 'off',
    },
  },
);
