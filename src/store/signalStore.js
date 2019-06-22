import Vue from 'vue'
import Vuex from 'vuex'
import crypto from '../workers/cryptoWorker'
import socketService from '../services/socketService'
import PromiseQueue from 'easy-promise-queue'
import userService from '../services/userService'

Vue.use(Vuex)

const noNeedForDecryption = ['userDisconnected', 'requestSymKey', 'userLeft', 'ping', 'pongAdminRequest', 'userInitialized']

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
      const teamKey = context.getters['teamSettings'].symKey
      const privKey = context.getters.user.privateKey
      if (noNeedForDecryption.includes(message.type)) {
        console.log('no need for decryption', message.type, message)
        // console.log("miauwkes", message)
        context.commit('addToQueue', () => {
          return context.dispatch(message.type, message)
        })
      } else if (!teamKey) {
        console.log('toetje 1', message)
        userService.getUserInfo(message.from).then((userinfo) => {
          console.log(userinfo)
          // crypto.asymmDecrypt(message.body).then(x => {
          const decrypted = crypto.openCryptoBox(message.body, crypto.toUint8Array(userinfo.data.publicKey), privKey)
          console.log(decrypted)
          message.body = decrypted
          context.commit('addToQueue', () => {
            return context.dispatch(message.type, message)
          })
        })
      } else {
        console.log('toetje 2')
        // console.log("Opening the box", message.body, teamKey)
        console.log(teamKey)
        var x = crypto.openSecretBox(JSON.parse(message.body), teamKey)
        crypto.bytesToText(x)
        if (x) {
          message.body = JSON.parse(crypto.bytesToText(x))
          context.commit('addToQueue', () => {
            return context.dispatch(message.type, message)
          })
        }

        // crypto.symmDecrypt(message.body, teamKey).then(x => {
        //   if (x) message.body = JSON.parse(x)
        //   context.commit('addToQueue', () => {
        //     return context.dispatch(message.type, message)
        //   })
        // }).catch(e => {
        //   context.commit('setErrorMessage', { text: `Couldn't decrypt message, try again later`, extra: e })
        // })
      }
    },
    sendSignal: (context, signal) => {
      console.log('sendSignal!')
      const teamKey = context.getters['teamSettings'].symKey
      // crypto.symmEncrypt(JSON.stringify(signal.body), teamKey).then(x => {
      var ken = crypto.createSecretBox(JSON.stringify(signal.body), teamKey)
      console.log('ken', ken)
      signal.body = JSON.stringify(ken)
      socketService.sendSignal(signal)
    }
  },
  getters: {
    queue: state => state.queue
  }
})
