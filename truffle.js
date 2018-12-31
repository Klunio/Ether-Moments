// Allows us to use ES6 in our migrations and tests.
require('babel-register')

module.exports = {
  networks: {
  	development: {
    host: "127.0.0.1",
    port: 7545,
    network_id: "*" // 匹配任何network id
         
    },

    ganache: {
      host: '127.0.0.1',
      port: 7545,
      network_id: '*' // Match any network id
    }
  }
}
