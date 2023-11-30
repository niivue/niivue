module.exports = {
  testMatch: ['**/tests/**/noci*.js'],
  preset: 'jest-puppeteer',
  testTimeout: 90 * 1000,
  bail: false // stop all tests if one fails
}
