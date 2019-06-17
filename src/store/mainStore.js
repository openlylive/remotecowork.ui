import Vue from 'vue'
import Vuex from 'vuex'
import crypto from '../workers/cryptoWorker'
import userService from '../services/userService'
import cookie from 'js-cookie'
Vue.use(Vuex)

export default ({
  state: {
    promptMessages: [],
    snackbarMessage: '',
    notifier: null,
    fatalError: null
  },
  mutations: {
    setErrorMessage: (state, error) => {
      state.snackbarMessage = {
        text: error.text,
        extra: error.extra,
        error: true
      }
    },
    setFatalError: (state, error) => {
      state.fatalError = error
    },
    setSnackbarMessage: (state, msg) => {
      state.snackbarMessage = {
        text: msg,
        extra: null,
        error: false
      }
    },
    addPromptMessage: (state, message) => {
      state.promptMessages.push(message)
    },
    deletePrompt: (state, message) => {
      var index = state.promptMessages.map(msg => msg.id).indexOf(message.id)
      if (index > -1) {
        state.promptMessages.splice(index, 1)
      }
    },
    setNotifier: (state, notification) => {
      state.notifier = notification
    }
  },
  actions: {
    deletePrompt (context, payload) {
      context.commit('deletePrompt', payload.body)
    },
    init: async (context) => {
      console.log('stupid init!')
      context.commit('setUserKeys', { private: '', public: '' })
      // crypto.generateAsymmetricKeypair().then(x => {
      crypto.generateAsymmetricKeypairLibsodium().then(keyPair => {
        console.log('thenneben!')
        context.commit('setUserKeys', keyPair)
      }).catch(e => {
        context.commit('setErrorMessage', { text: `Couldn't generate keys, try again later`, extra: e })
      })
    },
    initWithKey: (context, payload) => {
      console.log('init with key!')
      userService.getUserInfo(payload.name).then(response => {
        // crypto.generatekey(payload.key)
        console.log(payload)
        console.log(response.data.publicKey)
        const priv = new Uint8Array(Object.values(payload.key))
        const publ = new Uint8Array(Object.values(response.data.publicKey))
        context.commit('setUserKeys', { privateKey: priv, publicKey: publ, boop: 'test' })

        context.dispatch('setUserName', {
          name: payload.name,
          teamName: payload.teamName,
          isKnown: true
        })
      }).catch(e => {
        console.log('Catching initwithkey', e)
        cookie.remove('user')
        context.commit('setUserFetched', { found: false, ready: true })
        context.commit('setUserKeys', { private: '', public: '' })
        context.commit('setSnackbarMessage', 'Due to an error we had to generate you some new keys')
        crypto.generateAsymmetricKeypair().then(x => {
          context.commit('setUserKeys', x)
          context.dispatch('setUserName', { name: payload.name })
        }).catch(e => {
          context.commit('setErrorMessage', { text: `Couldn't generate keys, try again later`, extra: e })
        })
      })
    },
    setSnackbarMessage: (context, msg) => context.commit('setSnackbarMessage', msg)
  },
  getters: {
    promptMessages: (state) => state.promptMessages,
    snackbarMessage: (state) => state.snackbarMessage,
    notifier: (state) => state.notifier,
    fatalError: (state) => state.fatalError
  }
})
