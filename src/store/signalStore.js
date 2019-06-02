import Vue from 'vue'
import Vuex from 'vuex'
import crypto from '../workers/cryptoWorker'
import socketService from '../services/socketService'
import PromiseQueue from 'easy-promise-queue'

Vue.use(Vuex)

const noNeedForDecryption = ['userDisconnected', 'requestSymKey', 'userLeft']

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
      const teamKey = context.getters['teamSettings'].symKey
      if (noNeedForDecryption.includes(message.type)) {
        context.commit('addToQueue', () => {
          return context.dispatch(message.type, message)
        })
      } else if (!teamKey) {
        console.log('Not teamkey')
        crypto.asymmDecrypt(message.body).then(x => {
          message.body = x
          context.commit('addToQueue', () => {
            return context.dispatch(message.type, message)
          })
        }).catch(e => {
          context.commit('setErrorMessage', { text: `Couldn't decrypt message, try again later`, extra: e })
        })
      } else {
        console.log('Else (dus wel met teamkey?)')
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
      console.log(context.getters['teamSettings'])
      console.log(teamKey)
      crypto.symmEncrypt(JSON.stringify(signal.body), teamKey).then(x => {
        signal.body = x
        socketService.sendSignal(signal)
      }).catch(e => {
        context.commit('setErrorMessage', { text: `Couldn't encrypt message, try again later`, extra: e })
      })
    }
  },
  getters: {
    queue: state => state.queue
  }
})
