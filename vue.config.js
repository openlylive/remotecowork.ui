var fs = require('fs')

module.exports = {
  devServer: {
    https: {
      key: process.env.NODE_ENV !== 'production' ? fs.readFileSync(process.env.VUE_APP_CERTS_LOCATION_KEY || '/certificates/key.pem') : '', // eslint-disable-line
      cert: process.env.NODE_ENV !== 'production' ? fs.readFileSync(process.env.VUE_APP_CERTS_LOCATION_CERT || '/certificates/cert.pem') : '' // eslint-disable-line
    },
    port: 8081
  },

  pwa: {
    name: 'cowork',
    themeColor: '#0f296a',
    msTileColor: '#0f296a'
  },

  pluginOptions: {
    webpackBundleAnalyzer: {
      openAnalyzer: true
    }
  },

  configureWebpack: {
    resolve: {
      alias: {
        moment: 'moment/src/moment'
      }
    }
  }
}
