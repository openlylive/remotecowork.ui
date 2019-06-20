import Vue from 'vue'
import Vuex from 'vuex'
import socketService from '../services/socketService'
import userService from '../services/userService'
import crypto from '../workers/cryptoWorker'
import Axios from 'axios'
import config from '../../public/static'
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
      console.log('setUserName userstore')
      state.user.name = name
    },
    setUserKeys: (state, keys) => {
      console.log('Setting user keys', state.user)
      state.user.privateKey = keys.privateKey
      state.user.publicKey = keys.publicKey
    },
    setUserFetched: (state, userFetched) => {
      state.userFetched = userFetched
    }
  },
  actions: {
    setUserName: (context, payload) => {
      console.log('setusername action', payload)
      context.commit('setUserName', payload.name)
      socketService.emit('identify', {
        name: payload.name,
        publicKey: context.getters.user.publicKey,
        location: context.getters.localJanusLocation,
        streamId: 5,
        online: true
      })
    },
    sendPingAdmins (context, teamName) {
      context.commit('setInvitationStatus', {
        adminRepliedToPing: false,
        pending: true,
        accepted: false
      })
      socketService.emit('pingAdmins', {
        username: context.state.user.name,
        teamname: teamName
      })
    },
    sendSymKeyRequest (context, teamName) {
      context.commit('setInvitationStatus', {
        adminRepliedToPing: true,
        pending: true,
        accepted: false
      })
      // context.commit('setSymKey', null)
      const id = Math.random().toString(36).substring(7)
      console.log('stuff', teamName)
      socketService.emit('requestSymKey', {
        teamname: teamName,
        id: id
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
        privateKey: '',
        publicKey: ''
      })
    },
    loginWith3BotFinished: (context, data) => {
      console.log('login with 3bot finished!', data)
      // context.commit("setUserName", data.username)
      Axios.get(`${config.threebot_api}/users/${data.username}`).then(response => {
        let verifiedState = crypto.verify3botSignature(data.signedhash, response.data.publicKey)
        if (localStorage.getItem('state') === crypto.bytesToText(verifiedState)) {
          var ciphertext = {
            ciphertext: crypto.a2b(JSON.parse(data.data).ciphertext),
            nonce: crypto.a2b(JSON.parse(data.data).nonce)
          }
          var tempAppKeyPair = JSON.parse(localStorage.getItem('tempAppKeyPair'))
          var plaintextBody = crypto.openCryptoBox(ciphertext, crypto.edPkToCurve(crypto.a2b(response.data.publicKey)), crypto.toUint8Array(tempAppKeyPair.privateKey))
          console.log(plaintextBody, crypto.bytesToText(plaintextBody))

          //
          const temp = crypto.generateCryptoBoxKeyPair()
          console.log(temp)
          // TODO: fill in key pair of user
          context.commit('setUserKeys', temp)
          context.dispatch('setUserName', { name: data.username })
        } else {
          console.log('Something went wrong')
        }
      })
    }
  },
  getters: {
    user: (state) => (state.user || null),
    userFetched: (state) => (state.userFetched || null)
  }
})
