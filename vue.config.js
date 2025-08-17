module.exports = {
  publicPath: process.env.NODE_ENV === 'production'
    ? '/ai/'  // 替换为你的仓库名称
    : '/',
  outputDir: 'dist',
  assetsDir: 'assets',
  productionSourceMap: false,
  configureWebpack: {
    output: {
      filename: 'assets/[name].[hash:8].js',
      chunkFilename: 'assets/[name].[hash:8].js'
    }
  }
};