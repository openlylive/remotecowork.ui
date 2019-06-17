import Vue from 'vue'
import Vuex from 'vuex'
import crypto from '../workers/cryptoWorker'
import socketService from '../services/socketService'
import PromiseQueue from 'easy-promise-queue'
import userService from '../services/userService'

Vue.use(Vuex)

const noNeedForDecryption = ['userDisconnected', 'requestSymKey', 'userLeft', 'ping', 'pongAdminRequest']

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
        context.commit('addToQueue', () => {
          return context.dispatch(message.type, message)
        })
      } else if (!teamKey) {
        console.log('toetje 1', message)
        userService.getUserInfo(message.from).then((userinfo) => {
          console.log(userinfo)
          // crypto.asymmDecrypt(message.body).then(x => {
          crypto.openCryptoBox(message.body, userinfo.data.publicKey, privKey).then(x => {
            console.log(x)
            message.body = x
            context.commit('addToQueue', () => {
              return context.dispatch(message.type, message)
            })
          }).catch(e => {
            context.commit('setErrorMessage', { text: `Couldn't decrypt message, try again later`, extra: e })
          })
        })
      } else {
        console.log('toetje 2')
        console.log(message.body, teamKey)
        crypto.symmDecrypt(message.body, teamKey).then(x => {
          if (x) message.body = JSON.parse(x)
          context.commit('addToQueue', () => {
            return context.dispatch(message.type, message)
          })
        }).catch(e => {
          context.commit('setErrorMessage', { text: `Couldn't decrypt message, try again later`, extra: e })
        })
        crypto.symmDecrypt(message.body, teamKey).then(x => {
          if (x) message.body = JSON.parse(x)
          context.commit('addToQueue', () => {
            return context.dispatch(message.type, message)
          })
        }).catch(e => {
          context.commit('setErrorMessage', { text: `Couldn't decrypt message, try again later`, extra: e })
        })
      }
    },
    sendSignal: (context, signal) => {
      const teamKey = context.getters['teamSettings'].symKey
      crypto.symmEncrypt(JSON.stringify(signal.body), teamKey).then(x => {
        signal.body = x
        socketService.sendSignal(signal)
      }).catch(e => {
        context.commpingit('setErrorMessage', { text: `Couldn't encrypt message, try again later`, extra: e })
      })
    }
  },
  getters: {
    queue: state => state.queue
  }
})
