import Vue from 'vue'
import Vuex from 'vuex'
import crypto from '../workers/cryptoWorker'
import socketService from '../services/socketService'
Vue.use(Vuex)

export default ({
  state: {
    messages: []
  },
  mutations: {
    addMessageToHistory: (state, message) => {
      state.messages.push(message)
    }
  },
  actions: {
    SOCKET_message: (context, message) => {
      const teamKey = context.getters['teamSettings'].symKey
      const x = crypto.openSecretBox(message.body, teamKey)
      message.body = crypto.bytesToText(x)
      context.commit('addMessageToHistory', message)
      context.commit('setNotifier', {
        title: `Message from ${message.from}`,
        body: message.body
      })
    },
    sendMessage: (context, message) => {
      var receiver = context.getters.teamMembers.find(u => u.name === message.to)
      if (!receiver) {
      }
      // FIXME
      const teamKey = context.getters['teamSettings'].symKey
      const c = crypto.createSecretBox(message.body, teamKey)
      message.body = c
      socketService.sendMessage(message)
    },
    sendMessageToEveryone (context, messageBody) {
      var me = context.getters['user']
      var teamMembers = context.getters['teamMembers'].filter(x => x.name !== me.name)

      var msg = {
        from: me.name,
        to: me.name,
        time: new Date(),
        body: messageBody
      }
      context.commit('addMessageToHistory', msg)
      teamMembers.forEach(tm => {
        // TODO Improve, we can now only encrypt once and send to everyone :)
        context.dispatch('sendMessage', {
          to: tm.name,
          body: messageBody
        })
      })
    }
  },
  getters: {
    messages: (state) => state.messages
  }
})
