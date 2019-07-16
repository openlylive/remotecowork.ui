import Vue from 'vue'
import Vuex from 'vuex'
import crypto from '../workers/cryptoWorker'
import socketService from '../services/socketService'
import PromiseQueue from 'easy-promise-queue'
import userService from '../services/userService'

Vue.use(Vuex)

const noNeedForDecryption = ['userDisconnected', 'requestSymKey', 'userLeft', 'ping', 'pongAdminRequest', 'userInitialized', 'accessDeclined']

export default ({
  state: {
    queue: new PromiseQueue({ concurrency: 1 })
  },
  mutations: {
    addToQueue (state, task) {
      state.queue.add(task)
    }
  },
  actions: {
    SOCKET_signal: (context, message) => {
      console.log('SIGNAL!', message)
      // console.log(context.getters.teams)
      if (noNeedForDecryption.includes(message.type)) {
        context.commit('addToQueue', () => {
          return context.dispatch(message.type, message)
        })
        return
      }
      const teamKey = context.getters.teams[message.teamName].settings.symKey
      const privKey = context.getters.user.privateKey
      if (!teamKey) {
        userService.getUserInfo(message.from).then((userinfo) => {
          const decrypted = crypto.openCryptoBox(message.body, crypto.toUint8Array(userinfo.data.publicKey), privKey)
          message.body = decrypted
          context.commit('addToQueue', () => {
            return context.dispatch(message.type, message)
          })
        })
      } else {
        console.log(message)
        var x = crypto.openSecretBox(JSON.parse(message.body), teamKey)
        crypto.bytesToText(x)
        if (x) {
          message.body = JSON.parse(crypto.bytesToText(x))
          context.commit('addToQueue', () => {
            return context.dispatch(message.type, message)
          })
        }
      }
    },
    sendSignal: (context, signal) => {
      const teamKey = context.getters.teams[signal.teamName].settings.symKey

      var ken = crypto.createSecretBox(JSON.stringify(signal.body), teamKey)
      signal.body = JSON.stringify(ken)
      socketService.sendSignal(signal)
    }
  },
  getters: {
    queue: state => state.queue
  }
})
