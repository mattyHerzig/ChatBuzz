const path = require('path');

module.exports = {
  mode: 'production',
  entry: './chatbuzz.js',
  output: {
    path: path.resolve(__dirname, './'),
    filename: 'bundle.js',
  },
};
