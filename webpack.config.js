const path = require('path');

module.exports = {
  entry: './src/niivue.js',
  mode: 'production', // or 'development' for useful unmangled debugging
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'niivue.js',
    library: {
      name: 'niivue',
      type: 'umd'
    },
    globalObject: 'this',
  },
};
