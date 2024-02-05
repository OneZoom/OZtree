const path = require('path')

const config = require('./webpack.config')

config.output.path = path.resolve(__dirname, 'static/OZTreeModule/dist/')
config.devtool = 'eval-source-map'

module.exports = config
