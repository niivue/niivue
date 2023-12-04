module.exports = {
  root: true,
  env: {
    browser: true
  },
  globals: {
    niivue: true
  },
  ignorePatterns: ['dist/**/*', 'devdocs/**/*'],
  extends: ['standard', 'plugin:@typescript-eslint/recommended', 'plugin:prettier/recommended'],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'eslint-plugin-tsdoc', 'prettier'],
  rules: {
    curly: ['error', 'all'],
    camelcase: 'off',
    'import/order': 'error',
    'no-use-before-define': 'off',
    '@typescript-eslint/array-type': ['error', { default: 'array-simple' }],
    '@typescript-eslint/no-use-before-define': 'error',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    'prettier/prettier': [
      'error',
      {
        tabWidth: 2,
        printWidth: 120,
        singleQuote: true,
        trailingComma: 'none',
        semi: false
      }
    ]
  },
  // separate ESLint rules for TS files for now
  overrides: [
    {
      files: ['**/*.ts'],
      rules: {
        '@typescript-eslint/explicit-function-return-type': 'error',
        'tsdoc/syntax': 'warn'
      }
    }
  ]
}
