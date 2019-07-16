import Vue from 'vue'
import Vuex from 'vuex'
import crypto from '../workers/cryptoWorker'
import userService from '../services/userService'
import router from '../router'
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
      context.commit('setUserKeys', { private: '', public: '' })
      var keyPair = crypto.generateCryptoBoxKeyPair()
      context.commit('setUserKeys', keyPair)
    },
    initWithKey: (context, payload) => {
      console.log('init with key!')
      userService.getUserInfo(payload.name).then(response => {
        const priv = new Uint8Array(Object.values(payload.privateKey))
        const publ = new Uint8Array(Object.values(response.data.publicKey))
        context.commit('setUserKeys', { privateKey: priv, publicKey: publ, boop: 'test' })

        context.dispatch('setUserName', {
          name: payload.name,
          teamName: payload.teamName,
          isKnown: true
        })
      }).catch(e => {
        if (payload.name.split('.')[1] === '3bot') {
          console.log('you are a 3botuser!!!! I should not generate keys')
          context.commit('setUserKeys', { private: '', public: '' })
          context.commit('setSnackbarMessage', 'Your login has expired. Please log in again')
          router.push('/login')
        } else {
          console.log('not a 3botuser')
          context.commit('setUserFetched', { found: false, ready: true })
          context.commit('setUserKeys', { private: '', public: '' })
          context.commit('setSnackbarMessage', 'Due to an error we had to generate you some new keys')
          var keys = crypto.generateCryptoBoxKeyPair()
          context.commit('setUserKeys', keys)
          context.dispatch('setUserName', { name: payload.name })
        }
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
