const path = require('path');

module.exports = {
  mode: 'production',
  entry: './src/main.ts',
  output: {
    path: path.resolve(__dirname, './dist/'),
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
  resolve: {
    extensions: ['.ts', '.js'],
  },
};
