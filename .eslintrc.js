module.exports = {
  env: {
    browser: true
  },
  root: true,
  ignorePatterns: ['dist/**/*'],
  extends: ['standard', 'plugin:prettier/recommended'],
  plugins: ['prettier'],
  rules: {
    camelcase: 'off',
    'import/order': 'error',
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
  }
}
