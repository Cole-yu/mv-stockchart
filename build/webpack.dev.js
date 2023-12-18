const path = require('path');
const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');
const { SERVER_HOST, SERVER_PORT } = require('./constant.js');

module.exports = merge(common, {
  mode: 'development',
  devtool: 'eval-cheap-module-source-map',
  devServer: {
    compress: true,
    host: SERVER_HOST,
    port: SERVER_PORT,
    // open: true,
    static: {
      directory: path.resolve(__dirname, '..', 'dist'),
    },
    hot: true,
    // overlay: true, // 错误时在浏览器上全屏覆盖
    // proxy: {
    //   '/api/log': {
    //     target: 'http://127.0.0.1:3000',
    //     pathRewrite: {'^/api/log' : ''}
    //   },
    // }
  },
  optimization: {
    minimize: false,
    minimizer: [],
  }
});