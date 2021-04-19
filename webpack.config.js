const path = require('path');

module.exports = {
  entry: './src/niivue.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'niivue.js',
    library: {
      name: 'niivue',
      type: 'umd'
    }
  },
};
