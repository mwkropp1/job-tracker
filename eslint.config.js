import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import eslintPluginSecurity from 'eslint-plugin-security'
import eslintPluginImport from 'eslint-plugin-import'

export default tseslint.config(
  {
    ignores: ['**/dist', '**/node_modules', '**/build'],
  },
  {
    files: ['**/*.{js,ts}'],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      ...tseslint.configs.strict,
    ],
    plugins: {
      'security': eslintPluginSecurity,
      'import': eslintPluginImport,
    },
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: './packages/backend/tsconfig.json',
        ecmaVersion: 2022,
        sourceType: 'module'
      }
    },
    rules: {
      // TypeScript strict rules
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_'
      }],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/prefer-nullish-coalescing': 'off', // Requires type info
      '@typescript-eslint/prefer-optional-chain': 'off', // Requires type info

      // Security rules
      'security/detect-object-injection': 'error',
      'security/detect-non-literal-regexp': 'error',
      'security/detect-unsafe-regex': 'error',
      'security/detect-buffer-noassert': 'error',
      'security/detect-child-process': 'error',
      'security/detect-disable-mustache-escape': 'error',
      'security/detect-eval-with-expression': 'error',
      'security/detect-no-csrf-before-method-override': 'error',
      'security/detect-non-literal-fs-filename': 'error',
      'security/detect-non-literal-require': 'error',
      'security/detect-possible-timing-attacks': 'error',
      'security/detect-pseudoRandomBytes': 'error',

      // Import rules
      'import/order': ['warn', {
        'groups': [
          'builtin',
          'external',
          'internal',
          'parent',
          'sibling',
          'index'
        ],
        'newlines-between': 'always',
        'alphabetize': {
          'order': 'asc',
          'caseInsensitive': true
        }
      }],
      'import/no-duplicates': 'error',
      'import/no-unresolved': 'off', // Handled by TypeScript

      // General code quality
      'no-console': 'warn',
      'no-debugger': 'error',
      'prefer-const': 'error',
      'no-var': 'error',
      'eqeqeq': 'error',
      'curly': 'error',
      'no-unused-vars': 'off', // Using TypeScript version instead
    },
    languageOptions: {
      parserOptions: {
        ecmaFeatures: {
          jsx: true
        }
      }
    }
  },
  // Backend-specific rules
  {
    files: ['packages/backend/**/*.{js,ts}'],
    rules: {
      // Allow console in backend code
      'no-console': 'off',
      // Node.js specific security rules
      'security/detect-child-process': 'warn', // Sometimes needed in backend
      'security/detect-non-literal-fs-filename': 'warn', // Sometimes needed for file operations

      // Additional backend security rules (balanced for development)
      '@typescript-eslint/no-explicit-any': 'warn', // Warn for development
      '@typescript-eslint/no-unsafe-assignment': 'off', // Requires type info
      '@typescript-eslint/no-unsafe-call': 'off', // Requires type info
      '@typescript-eslint/no-unsafe-member-access': 'off', // Requires type info
      '@typescript-eslint/no-unsafe-return': 'off', // Requires type info

      // Prevent common backend vulnerabilities
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-script-url': 'error',

      // TypeScript strict rules for backend
      '@typescript-eslint/strict-boolean-expressions': 'off', // Too strict for development
      '@typescript-eslint/prefer-nullish-coalescing': 'off', // Requires type info
      '@typescript-eslint/prefer-optional-chain': 'off', // Requires type info
    }
  }
)