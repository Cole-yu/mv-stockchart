const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const TerserPlugin = require("terser-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const webpack = require("webpack");
const { VueLoaderPlugin } = require('vue-loader');
const chalk = require('chalk');
const ProgressBarPlugin = require('progress-bar-webpack-plugin');
const { rootResolve, devMode, banner } = require('./utils.js');

module.exports = {
  resolve: {
    extensions: [".js", ".jsx", ".json", ".vue"], // 可省略后缀
    alias: {
      '@': rootResolve('packages/stock-chart/src')
    }
  },
  mode: 'production',
  devtool: 'source-map',
  // experiments: {
  //   outputModule: true,
  // },
  entry: {
    "mv-stockchart.umd": {
      import: rootResolve('packages/index.js'),
      library: {
        name: 'MvStockChart',
        type: 'umd',
        umdNamedDefine: true,
      },
    },
    // "mv-stockchart.esm": {
    //   import: rootResolve('packages/index.js'),
    //   library: {
    //     type: 'module', // 输出ESM模块，experiments.outputModule 必须 true
    //   },
    // },
    "mv-stockchart.commonjs": {
      import: rootResolve('packages/index.js'),
      library: {
        name: 'MvStockChart',
        type: 'commonjs',
      },
    },
  },
  output: {
    filename: '[name].min.js', // 'mv-stockchart.umd.min.js',
    path: rootResolve('lib'),
    // library: {
    //   name: 'MvStockChart',
    //   type: 'umd',
    //   umdNamedDefine: true,
    // },
    clean: true,
  },
  module: {
    rules: [
      {
        test: /\.m?js$/,
        exclude: /node_modules/,
        loader: 'babel-loader'
      },
      {
        test: /\.vue$/,
        loader: 'vue-loader',
        options: {
          compiler: require('vue-template-compiler'), // 默认编译器
          compilerOptions: { // 编译器选项
            preserveWhitespace: false // 移除模板标签之间的换行空格
          }
        }
      },
      {
        test: /\.less$/i,
        use: [
          // 'style-loader',
          {
            loader: MiniCssExtractPlugin.loader,
            options: {
              publicPath: '../',
            }
          },
          'css-loader',
          'postcss-loader',
          'less-loader',
        ],
      },
      {
        test: /\.css$/i,
        use: [
          // 'style-loader', // 将 CSS 生成 style 标签插入 HTML 中
          {
            loader: MiniCssExtractPlugin.loader, //抽离css的loader
            options: {
              publicPath: '../', // css抽离后路径发生变化
            }
          },
          'css-loader',
          'postcss-loader'
        ],
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'images/[name].[contenthash][ext]'
        },
        parser: {
          dataUrlCondition: {
            maxSize: 20 * 1024 // 操过20kb就使用图片资源，小于20kb就使用base64编码
          }
        }
      },
      // 打包字体图标
      {
        test: /\.(eot|svg|woff|woff2|ttf)$/,
        type: 'asset/resource',
        generator: {
          filename: 'fonts/[contenthash][ext]',
        },
      },
    ],
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: devMode ? 'style/[name].css' : 'style/[name].[chunkhash:8].css',
      // ignoreOrder: false, // 启用关闭 警告⚠️
      // chunkFilename: `style/[name].[chunkhash:8].css`
    }),
    // 设定环境变量
    new webpack.DefinePlugin({
      "PUBLIC_PATH": JSON.stringify("./"),
      "process.env": JSON.stringify({ // 传递的值必须字符串化
        ...process.env,
        "SHOW_CONFIG_HEADER": "TRUE"
      })
    }),
    new VueLoaderPlugin(),
    // 编译进度提示
    new ProgressBarPlugin({
      format: `:msg [:bar] ${chalk.green.bold(':percent')} (:elapsed s)`,
      clear: false
    }),
    new webpack.BannerPlugin(banner)
  ],
  optimization: {
    usedExports: true, // tree sharking，与 package.json 的 sideEffects 配合使用
    minimize: true,
    minimizer: [
      new CssMinimizerPlugin(),
      new TerserPlugin({
        parallel: true, // 多进程
        extractComments: false, // 不创建许可证文件和注释 vendors.js.LICENSE.txt
        terserOptions: {
          format: {
            comments: false, // 删除js中的注释
          },
          compress: {
            // 移除所有console相关代码；
            drop_console: true,
            // 移除自动断点功能；
            drop_debugger: true,
            // 配置移除指定的指令，如console.log,alert
            pure_funcs: ['console.log', 'console.error'],
          },
        },
      })
    ],
    moduleIds: 'deterministic',
  },
  performance: {
    hints: devMode ? false : 'warning',
    // 入口起点的最大体积 整数类型（以字节为单位）
    maxEntrypointSize: 2000000, // 1kb=1024个字节=8比特
    // 生成文件的最大体积 整数类型（以字节为单位 300k）
    maxAssetSize: 1000000,
    // 只给出 js/css 文件的性能提示
    assetFilter: function (assetFilename) {
      return assetFilename.endsWith('.css') || assetFilename.endsWith('.js');
    }
  },
  // 外部扩展引入，防止单个文件体积过大，影响首屏渲染
  externals: {
    "vue": 'Vue',
  },
};