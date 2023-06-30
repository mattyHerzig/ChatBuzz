const path = require('path');

module.exports = {
  mode: 'production',
  entry: './chatbuzz.ts',
  output: {
    path: path.resolve(__dirname, './'),
    filename: 'bundle.js',
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
};
