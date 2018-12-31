const path = require('path')
const CopyWebpackPlugin = require('copy-webpack-plugin')

module.exports = {
  devServer:{
      inline:true,
      port:8081
  },
  entry: {
    // index: './app/javascript/index.js', 
    login: './app/javascript/login.js',
    register: './app/javascript/register.js',
    success:'./app/javascript/success.js',
    home: './app/javascript/home.js'
  },
  mode: 'production',
  output: {
    path: path.resolve(__dirname, 'build'),
    filename: 'app-[name].js'
  },
  plugins: [
    // Copy our app's index.html to the build folder.
    new CopyWebpackPlugin([
      { from: './app/html/index.html', to: 'index.html' },
      { from: './app/html/login.html', to: 'login.html'},
      { from: './app/html/register.html', to: 'register.html'},
      { from: './app/html/success.html', to: 'success.html'},
      { from: './app/html/home.html', to: 'home.html'},
      { from: './app/home.css', to: 'home.css'}
      
    ])
  ],
  devtool: 'source-map',
  module: {
    rules: [
      {
        test: /\.(scss)$/,
        use: [{
          loader: 'style-loader', // inject CSS to page
        }, {
          loader: 'css-loader', // translates CSS into CommonJS modules
        }, {
          loader: 'postcss-loader', // Run post css actions
          options: {
            plugins: function () { // post css plugins, can be exported to postcss.config.js
              return [
                require('precss'),
                require('autoprefixer')
              ];
            }
          }
        }, 
        {
          loader: 'sass-loader', // compiles Sass to CSS
          options:{
            includePaths:["./app/"]
          }
        }]
      },


      {
        test: /\.js$/,
        exclude: /(node_modules|bower_components)/,
        loader: 'babel-loader',
        query: {
          presets: ['env'],
          plugins: ['transform-react-jsx', 'transform-object-rest-spread', 'transform-runtime']
        }
      }
    ]
  }
}

