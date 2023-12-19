const path = require('path')

const config = require('./webpack.config')

config.output.path = path.resolve(__dirname, 'static/OZTreeModule/dist/')

module.exports = config
