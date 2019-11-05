const webpack = require('webpack'); //to access built-in plugins

var config = {
  entry: {
    //at: './OZprivate/rawJS/OZTreeModule/src/at.js',
    OZentry: './OZprivate/rawJS/OZTreeModule/src/OZentry.js',
    search_ui: './OZprivate/rawJS/OZTreeModule/src/search_ui.js',
    //polytomy: './OZprivate/rawJS/OZTreeModule/src/polytomy.js'
  },
  output: {
    filename: '[name].js',
    path: './OZprivate/rawJS/OZTreeModule/dist/',
    library: '[name]',
  },
  externals: {
    'jquery': 'jQuery'
  },
  module: {
    loaders: [
      {
        test: /\.js/,
        exclude: /(node_modules|bower_components)/,
        loader: 'babel-loader?presets[]=es2015'
      }
    ]
  },
  plugins: [
    new webpack.optimize.CommonsChunkPlugin({
      name: 'common',
      minChunks: 3
    }),
    new webpack.DefinePlugin({
      'process.env': {
        'NODE_ENV': JSON.stringify(process.env.NODE_ENV)
      }
    })
  ]
}

if (process.env.NODE_ENV === 'production') {
  //production mode. do nothing here
} else {
  //development mode.
  config.devtool = 'inline-source-map'; // this keeps the line numbers constant for debugging - it should be commented out for release versions of the code.
}

module.exports = config;
