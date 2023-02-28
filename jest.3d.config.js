module.exports = {
  testMatch: ["**/tests/**/noci*.js"],
  preset: "jest-puppeteer",
  testTimeout: 60 * 1000,
  bail: true, // stop all tests if one fails
};
