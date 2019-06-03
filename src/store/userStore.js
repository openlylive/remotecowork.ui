import Vue from 'vue'
import Vuex from 'vuex'
import socketService from '../services/socketService'
import userService from '../services/userService'
import crypto from '../workers/cryptoWorker'
Vue.use(Vuex)

export default ({
  state: {
    user: {
      name: '',
      privateKey: '',
      publicKey: ''
    },
    userFetched: {
      found: false,
      ready: false
    }
  },
  mutations: {
    setUserName: (state, name) => {
      state.user.name = name
    },
    setUserKeys: (state, keys) => {
      state.user.privateKey = keys.private
      state.user.publicKey = keys.public
    },
    setUserFetched: (state, userFetched) => {
      state.userFetched = userFetched
    }
  },
  actions: {
    setUserName: (context, payload) => {
      context.commit('setUserName', payload.name)
      socketService.emit('identify', {
        name: payload.name,
        publicKey: context.getters.user.publicKey,
        location: context.getters.localJanusLocation,
        streamId: 5,
        online: true
      })
    },
    sendSymKeyRequest (context, teamName) {
      console.log('Sending sym key request')
      context.commit('setInvitationStatus', {
        pending: true,
        accepted: false
      })
      // context.commit('setSymKey', null)
      const id = Math.random().toString(36).substring(7)
      socketService.emit('requestSymKey', {
        teamname: teamName,
        id: id
      })
      context.commit('setInvitationStatus', {
        pending: true,
        accepted: false
      })
    },
    fetchUser: (context, name) => {
      userService.getUserInfo(name).then(d => {
        context.commit('setUserFetched', {
          found: true,
          ready: true
        })
      }).catch(e => {
        context.commit('setUserFetched', {
          found: false,
          ready: true
        })
      })
    },
    SOCKET_identitycheck: (context, payload) => {
      crypto.decrypt({ text: payload.body }).then(x => {
        socketService.emit('identitycheck', x)
      }).catch(e => {
        context.dispatch('clearUSer')
        context.commit('setFatalError', {
          text: 'Could not verify user',
          action: 'relogin'
        })
      })
    },
    SOCKET_identitycheckInvalid: (context) => {
      context.dispatch('clearUSer')
      context.commit('setFatalError', {
        text: 'Could not verify user',
        action: 'relogin'
      })
    },
    clearUser: (context) => {
      context.commit('setUserFetched', {
        found: false,
        ready: false
      })
      context.commit('setUserName', '')
      context.commit('setUserKeys', {
        private: '',
        public: ''
      })
    }
  },
  getters: {
    user: (state) => (state.user || null),
    userFetched: (state) => (state.userFetched || null)
  }
})
