import js from '@eslint/js';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  // Ignorar node_modules e build
  {
    ignores: ['node_modules/', 'dist/', 'build/', 'coverage/']
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
      'react-hooks': reactHooks
    },
    languageOptions: {
      parserOptions: {
        ecmaFeatures: {
          jsx: true
        }
      },
      globals: {
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        localStorage: 'readonly',
        FormData: 'readonly',
        FileReader: 'readonly',
        requestAnimationFrame: 'readonly'
      }
    },
    settings: {
      react: {
        version: 'detect'
      }
    },
    rules: {
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      
      // Regras de qualidade
      'no-unused-vars': 'off', // Desligado pois o TS tem它的
      'no-console': 'warn',
      'eqeqeq': ['error', 'always'],
      
      // Nomenclatura
      'camelcase': 'error'
    }
  },

  // Arquivos TypeScript (não JSX)
  {
    files: ['**/*.ts'],
    plugins: {
      react,
      'react-hooks': reactHooks
    },
    languageOptions: {
      globals: {
        console: 'readonly',
        process: 'readonly'
      }
    },
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_' 
      }],
      'no-console': 'warn',
      'eqeqeq': ['error', 'always'],
      'camelcase': 'error'
    }
  }
);