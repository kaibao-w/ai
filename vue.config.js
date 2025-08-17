const { defineConfig } = require('@vue/cli-service')
module.exports = defineConfig({
  transpileDependencies: [],
  publicPath: process.env.NODE_ENV === 'production'
    ? '/ai/'  // 替换为你的仓库名称
    : '/'
})