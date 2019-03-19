import Vue from 'vue'
import store from '../store'
import VueSocketIO from 'vue-socket.io/dist/vue-socketio'
import config from '../../public/static'

Vue.use(new VueSocketIO({
  debug: true,
  secure: true,
  connection: config.nodeserver,
  vuex: {
    store,
    actionPrefix: 'SOCKET_'
  }
}))
