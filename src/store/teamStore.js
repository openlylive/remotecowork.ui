import Vue from 'vue'
import Vuex from 'vuex'
import crypto from '../workers/cryptoWorker'
import userService from '../services/userService.js'
import socketService from '../services/socketService.js'
import groupBy from 'lodash/groupBy'
import cloneDeep from 'lodash/cloneDeep'
Vue.use(Vuex)

export default ({
  state: {
    invitationAcceptancePending: false,
    invitationAccepted: false,
    adminRepliedToPing: false,
    teamMembers: [],
    teamSettings: {},
    isRejoining: true,
    teamNameCheckStatus: {
      checking: false,
      checked: false,
      valid: false
    },
    acceptedWait: false,
    teamNameCheckerTimeout: null,
    adminKey: null
  },
  mutations: {
    addTeamMembers: (state, user) => {
      if (!state.teamMembers.some(tm => tm.name === user.name)) state.teamMembers.push(user)
    },
    deleteTeamMembers: (state, username) => {
      var index = state.teamMembers.findIndex(user => user.name === username)
      state.teamMembers.splice(index, 1)
    },
    updateTeamMember: (state, user) => {
      var index = state.teamMembers.findIndex(u => u.name === user.name)
      state.teamMembers[index] = user
    },
    updateTeamMemberLocation: (state, user) => {
      var index = state.teamMembers.findIndex(u => u.name === user.name)
      state.teamMembers[index].location = user.location
    },
    disconnectedTeamMembers: (state, username) => { // todo remove and replace with updateteammembmer
      var index = state.teamMembers.findIndex(user => user.name === username)
      state.teamMembers[index].online = false
    },
    connectedTeamMembers: (state, username) => { // todo remove and replace with updateteammembmer
      var index = state.teamMembers.findIndex(user => user.name === username)
      state.teamMembers[index].online = true
    },
    setTeamMembers: (state, teamMembers) => {
      state.teamMembers = teamMembers
    },
    setInvitationStatus: (state, status) => {
      state.invitationAcceptancePending = status.pending
      state.invitationAccepted = status.accepted
    },
    clearHistory: (state) => {
      state.teamMembers = []
    },
    isRejoining (state, isRejoining) {
      state.isRejoining = isRejoining
    },
    setTeamSettings (state, settings) {
      settings.admins = settings.admins.map(x => {
        return {
          name: x.name
        }
      })
      state.teamSettings = settings
    },
    setTeamName (state, name) {
      if (state.teamSettings) {
        state.teamSettings.name = name
      } else {
        state.teamSettings = {
          name: name
        }
      }
    },
    setSymKey (state, key) {
      key = crypto.toUint8Array(key)
      if (state.teamSettings) {
        state.teamSettings.symKey = key
      } else {
        state.teamSettings = {
          symKey: key
        }
      }
    },
    setAdminRepliedToPing (state) {
      state.adminRepliedToPing = true
    },
    setTeamAdmin (state, admins) {
      var newAdmins = admins.map(x => {
        return {
          name: x.name
        }
      })
      if (state.teamSettings) {
        state.teamSettings.admins = newAdmins
      } else {
        state.teamSettings = {
          admins: newAdmins
        }
      }
    },
    setTeamNameCheckingStatus (state, status) {
      state.teamNameCheckStatus = status
    },
    setTeamNameCheckerTimeout (state, timeout) {
      state.teamNameCheckerTimeout = timeout
    },
    setAcceptedWait (state, wait) {
      state.acceptedWait = wait
    },
    setAdminKey (state, key) {
      state.adminKey = key
    }
  },
  actions: {
    accessDeclined: (context, payload) => {
      context.commit('setInvitationStatus', {
        pending: false,
        accepted: false
      })
    },
    accessGrantedKnown: async (context, payload) => { // TODO cleanup
      const symkey = payload.body
      var admin = {
        name: payload.from
      }
      context.commit('setTeamSettings', {
        admins: [admin],
        symKey: new Uint8Array(Object.values(symkey))
      })
      context.commit('isRejoining', true)
      context.commit('setInvitationStatus', {
        pending: false,
        accepted: true
      })
    },
    accessGranted: async (context, payload) => {
      const symkey = payload.body
      var admin = {
        name: payload.from
      }
      context.commit('setTeamSettings', {
        admins: [admin],
        symKey: new Uint8Array(Object.values(symkey))
      })
      context.commit('isRejoining', false)
      context.commit('setInvitationStatus', {
        pending: false,
        accepted: true
      })
    },
    rejectUser: (context, payload) => {
      socketService.sendSignal({
        type: 'accessDeclined',
        body: '',
        to: payload.user
      })
      const admins = context.getters['teamSettings'].admins
      admins.forEach(admin => {
        context.dispatch('sendSignal', {
          to: admin.name,
          type: 'deletePrompt',
          body: {
            id: payload.id
          }
        })
      })
    },
    acceptUser: (context, payload) => {
      context.commit('setAcceptedWait', true)
      const symKey = context.getters['teamSettings'].symKey
      userService.getUserInfo(payload.user).then(async response => {
        var pubKey = crypto.toUint8Array(response.data.publicKey)
        const encryptedSymKeyB = await crypto.createCryptoBox(symKey, pubKey, context.getters['user'].privateKey)
        socketService.sendSignal({
          type: 'accessGranted',
          body: encryptedSymKeyB,
          to: payload.user
        })
        const admins = context.getters['teamSettings'].admins
        admins.forEach(admin => {
          context.dispatch('sendSignal', {
            to: admin.name,
            type: 'deletePrompt',
            body: {
              id: payload.id
            }
          })
        })
      })
    },
    createTeam: async (context, payload) => {
      var me = context.getters['user']

      context.commit('clearHistory', [])
      var newMe = {
        name: me.name,
        publicKey: me.publicKey,
        location: context.getters.localJanusLocation,
        streamId: 5,
        admin: true,
        online: true,
        muted: false
      }
      context.commit('setTeamSettings', {
        name: payload,
        admins: [newMe],
        symKey: crypto.generateSecretBoxKey()
      })
      socketService.emit('createTeam', { name: payload, admins: [newMe] })
      context.commit('isRejoining', false)

      context.commit('addTeamMembers', newMe)
    },
    ping (context, payload) {
      console.log('got ping', context, payload)
      socketService.sendSignal({
        type: 'pongAdminRequest',
        body: 'pong',
        to: payload.from
      })
    },
    pongAdminRequest (context, payload) {
      console.log('got the pongelong')
      context.commit('setAdminRepliedToPing')
    },
    requestSymKey (context, payload) {
      const symKey = context.getters['teamSettings'].symKey
      const teamMmebers = context.getters['teamMembers']
      const isKnown = !!teamMmebers.find(tm => tm.name === payload.from)
      if (isKnown) { // If user is already member of team
        userService.getUserInfo(payload.from).then(async response => {
          var pubKey = crypto.toUint8Array(response.data.publicKey)
          context.commit('setAdminKey', pubKey)
          const cryptobox = crypto.createCryptoBox(symKey, pubKey, context.getters['user'].privateKey) // A cryptobox containing the new symmetric key
          // const encryptedSymKey = crypto.asymmEncrypt(symKey, response.data.publicKey)
          socketService.sendSignal({
            type: 'accessGrantedKnown',
            body: await cryptobox,
            to: response.data.name
          })
        })
      } else {
        context.commit('addPromptMessage', {
          id: payload.body.id,
          title: 'Permission requested',
          body: `User <strong>${window.escapeHtml(payload.from)}</strong> wants to access <strong>${window.escapeHtml(payload.body.teamname)}</strong>`,
          cancelMessage: 'Close the gates',
          okMessage: 'Let him in',
          okAction: 'acceptUser',
          cancelAction: 'rejectUser',
          payload: {
            id: payload.body.id,
            user: payload.from,
            team: payload.body.teamName
          }
        })
        context.commit('setNotifier', {
          title: `Access request`,
          body: `User ${payload.from} wants to access ${payload.body}`
        })
      }
    },
    async userAdded (context, payload) {
      return new Promise((resolve, reject) => {
        // todo rewrite bridges
        var user = context.getters.user
        var newUser = payload.body.userInfo
        var symKey = payload.body.newSymKey
        context.commit('setSymKey', symKey)
        if (!context.getters.someoneScreenSharing) context.commit('setNoiseMaker', newUser)

        context.commit('setInvitationStatus', {
          pending: false,
          accepted: true,
          muted: false
        })
        if (newUser.name === user.name) return
        context.commit('addTeamMembers', newUser)
        var currentBridges = context.getters.currentBridges
        if (currentBridges[newUser.location] === undefined) {
          if (!context.getters.janusrtpfwd[newUser.location]) {
            context.dispatch('addJanusRtpFwd', { location: newUser.location, desktop: false }).then(x => {
              resolve()
              context.dispatch('createJanusBridgeAndSendStreamOpened', { userList: [newUser], location: newUser.location })
            })
          } else {
            resolve()
            context.dispatch('createJanusBridgeAndSendStreamOpened', { userList: [newUser], location: newUser.location })
          }
        } else {
          resolve()
          context.dispatch('sendSignal', { to: newUser.name, type: 'streamopened', body: { id: currentBridges[newUser.location].id, pin: currentBridges[newUser.location].pin } })
          context.dispatch('sendPli', context.getters.janusrtpfwd[newUser.location])
        }
        if (context.getters.screensharing) {
          var currentDesktopBridges = context.getters.currentDesktopBridges
          if (currentDesktopBridges[newUser.location] === undefined) {
            if (!context.getters.janusrtpfwd[newUser.location]) {
              context.dispatch('addJanusRtpFwd', { location: newUser.location, desktop: true }).then(x => {
                resolve()
                context.dispatch('createJanusBridgeAndSendStreamOpened', { userList: [newUser], location: newUser.location })
              })
            } else {
              resolve()
              context.dispatch('createJanusBridgeAndSendStreamOpened', { userList: [newUser], location: newUser.location })
            }
          } else {
            resolve()
            context.dispatch('sendSignal', { to: newUser.name, type: 'desktopstreamopened', body: { id: currentDesktopBridges[newUser.location].id, pin: currentDesktopBridges[newUser.location].pin } })
            context.dispatch('sendPli', context.getters.janusrtpfwd[newUser.location])
          }
        }
        if (user.name !== newUser.name) {
          context.commit('addMessageToHistory', {
            type: 'systemMessage',
            body: `User ${newUser.name} joined`
          })
        }
      })
    },
    userlist (context, payload) {
      return new Promise((resolve, reject) => {
        var teamMembers = payload.body.list
        context.commit('setTeamName', payload.body.name)
        context.commit('setTeamMembers', teamMembers)
        if (teamMembers.length === 1) resolve()
        var localUser = context.getters.user
        var filtered = teamMembers.filter(t => t.name !== localUser.name && t.online)
        if (!context.getters.someoneScreenSharing) context.commit('setNoiseMaker', filtered[0])
        var locations = groupBy(filtered, 'location')
        for (var location of Object.keys(locations)) {
          const loc = cloneDeep(location)
          if (!context.getters.janusrtpfwd[loc]) {
            context.dispatch('addJanusRtpFwd', { location: loc, desktop: false }).then(r => {
              context.dispatch('createJanusBridgeAndSendStreamOpened', { userList: locations[loc], location: loc }).then(x => {
                resolve()
              })
            })
          } else {
            context.dispatch('createJanusBridgeAndSendStreamOpened', { userList: locations[loc], location: loc }).then(x => {
              resolve()
            })
          }
        }

        context.commit('setTeamAdmin', teamMembers.filter(tm => tm.admin).map(x => { return { name: x.name } }))
        context.commit('addTeamMembers', {
          ...context.getters.user,
          online: true,
          muted: false
        })
        if (context.getters['isRejoining']) {
          context.dispatch('sendRejoin')
        }
        resolve('')
      })
    },
    async userInitialized (context, payload) {
      return new Promise((resolve, reject) => {
        var newSymKey = context.getters['teamSettings'].symKey // todo change?
        var teamName = context.getters['teamSettings'].name
        var teammembers = context.getters['teamMembers']
        userService.getUserInfo(payload.from).then(userInfo => {
          context.dispatch('sendSignal', {
            type: 'userlist',
            body: {
              list: teammembers,
              name: teamName
            },
            to: payload.from
          })
          userInfo.data.streamId = 5
          userInfo.data.online = true
          userInfo.data.muted = false
          if (!teammembers.find(t => t.name === payload.from)) {
            teammembers.forEach(teammember => {
              context.dispatch('sendSignal', {
                type: 'userAdded',
                body: {
                  userInfo: userInfo.data,
                  newSymKey: newSymKey
                },
                to: teammember.name
              })
            })
            context.commit('addTeamMembers', userInfo.data)
            context.commit('setAcceptedWait', false)
          } else if (teammembers.find(t => t.name === payload.from && t.admin && t.name !== context.getters['user'].name)) {
            context.commit('connectedTeamMembers', payload.from)
          }
          resolve()
        }).catch(e => {
          context.commit('setErrorMessage', { text: `Couldn't get user info for ${payload.from}`, extra: e })
          resolve()
        })
      })
    },
    userLeft (context, payload) {
      // TODO close some bridges if needed and cleanup janus
      var teamMembers = context.getters['teamMembers']
      if (teamMembers.find(x => x.name === payload.from)) {
        context.commit('deleteTeamMembers', payload.from)
        context.commit('addMessageToHistory', {
          type: 'systemMessage',
          body: `User ${payload.from} left`
        })
        if (context.getters['janusstreamingplugin'][payload.from]) {
          context.getters['janusstreamingplugin'][payload.from].send({ 'message': { 'request': 'stop' } })
          context.getters['janusstreamingplugin'][payload.from].hangup()
          context.getters['janusstreamingplugin'][payload.from].detach()
          delete context.getters['janusstreamingplugin'][payload.from]
        }

        if (payload.from !== context.getters.user.name && (!context.getters.someoneScreenSharing || context.getters.someoneScreenSharing === payload.from)) {
          context.dispatch('fixBigscreenStream')
          context.commit('setSomeoneScreenSharing', false)
        }
      }
    },
    kickUser (context, payload) {
      if (context.getters.teamMembers.find(t => t.name === context.getters.user.name && t.admin)) {
        context.getters.teamMembers.forEach(teamMember => {
          context.dispatch('sendSignal', { to: teamMember.name, type: 'userKicked', body: { username: payload } })
        })
      }
    },
    userKicked (context, payload) {
      // TODO close some bridges if needed and cleanup janus
      if (context.getters.teamMembers.find(t => t.name === payload.from && t.admin)) {
        var user = payload.body
        context.commit('deleteTeamMembers', user.username)
        context.commit('addMessageToHistory', {
          type: 'systemMessage',
          body: `User ${user.username} got kicked`
        })
      }
    },
    userDisconnected (context, payload) {
      // TODO close some bridges if needed and cleanup janus
      var teamMembers = context.getters['teamMembers']
      if (teamMembers.find(x => x.name === payload.from)) {
        context.commit('disconnectedTeamMembers', payload.from)
        context.commit('addMessageToHistory', {
          type: 'systemMessage',
          body: `User ${payload.from} is now offline`
        })
        var body = { 'request': 'stop' }
        if (context.getters['janusstreamingplugin'][payload.from]) {
          context.getters['janusstreamingplugin'][payload.from].send({ 'message': body })
          context.getters['janusstreamingplugin'][payload.from].hangup()
          context.getters['janusstreamingplugin'][payload.from].detach()
          delete context.getters['janusstreamingplugin'][payload.from]
        }
        if (payload.from !== context.getters.user.name && (!context.getters.someoneScreenSharing || context.getters.someoneScreenSharing === payload.from)) {
          context.dispatch('fixBigscreenStream')
          context.commit('setSomeoneScreenSharing', false)
        }
      }
    },
    leaveTeam (context, teamName) {
      context.commit('clearHistory')
      socketService.emit('leave', {})
    },
    sendRejoin (context, teamName) {
      const admin = context.getters.teamMembers.find(x => x.admin)
      context.dispatch('sendSignal', { to: admin.name, type: 'userRejoined', body: '' })
    },
    userRejoined (context, payload) {
      return new Promise((resolve, reject) => {
        var teamMembers = context.getters['teamMembers']
        const usersThatWillGetARejoinMessage = teamMembers.filter(t => t.name !== payload.from)
        if (teamMembers.some(x => x.name === payload.from) && usersThatWillGetARejoinMessage.length) {
          usersThatWillGetARejoinMessage.forEach(teamMember => {
            context.dispatch('sendSignal', { to: teamMember.name, type: 'userOnline', body: { username: payload.from } })
            resolve()
          })
        } else {
          resolve()
        }
      })
    },
    userOnline (context, payload) {
      return new Promise((resolve, reject) => {
        // todo rewrite bridges
        var username = payload.body.username
        if (context.getters.teamMembers.find(x => x.name === username)) {
          context.commit('connectedTeamMembers', username)
          context.commit('addMessageToHistory', {
            type: 'systemMessage',
            body: `User ${username} is now online`
          })
          userService.getUserInfo(payload.body.username).then(userInfo => { // todo check if getting userinfo is still needed
            var newUser = userInfo.data
            var currentBridges = context.getters.currentBridges
            context.commit('updateTeamMemberLocation', newUser)
            if (currentBridges[newUser.location] === undefined) {
              if (!context.getters.janusrtpfwd[newUser.location]) {
                context.dispatch('addJanusRtpFwd', { location: newUser.location, desktop: false }).then(x => {
                  context.dispatch('createJanusBridge', { receiverIp: newUser.location }).then(r => {
                    context.dispatch('sendSignal', { to: newUser.name, type: 'streamopened', body: { id: r.id, pin: r.pin } })
                    currentBridges[newUser.location] = { id: r.id, pin: r.pin }
                    context.commit('setCurrentBridges', currentBridges)
                    resolve()
                  })
                })
              } else {
                context.dispatch('createJanusBridge', { receiverIp: newUser.location }).then(r => {
                  context.dispatch('sendSignal', { to: newUser.name, type: 'streamopened', body: { id: r.id, pin: r.pin } })
                  currentBridges[newUser.location] = { id: r.id, pin: r.pin }
                  context.commit('setCurrentBridges', currentBridges)
                  resolve()
                })
              }
            } else {
              context.dispatch('sendSignal', { to: newUser.name, type: 'streamopened', body: { id: currentBridges[newUser.location].id, pin: currentBridges[newUser.location].pin } })
              context.dispatch('sendPli', context.getters.janusrtpfwd[newUser.location])
              resolve()
            }
            if (context.getters.screensharing) {
              var currentDesktopBridges = context.getters.currentDesktopBridges
              if (currentDesktopBridges[newUser.location] === undefined) {
                if (!context.getters.janusrtpfwd[newUser.location]) {
                  context.dispatch('addJanusRtpFwd', { location: newUser.location, desktop: true }).then(x => {
                    context.dispatch('createJanusBridge', { receiverIp: newUser.location }).then(r => {
                      context.dispatch('sendSignal', { to: newUser.name, type: 'desktopstreamopened', body: { id: r.id, pin: r.pin } })
                      currentDesktopBridges[newUser.location] = { id: r.id, pin: r.pin }
                      context.commit('setCurrentDesktopBridges', currentDesktopBridges)
                      resolve()
                    })
                  })
                } else {
                  context.dispatch('createJanusBridge', { receiverIp: newUser.location }).then(r => {
                    context.dispatch('sendSignal', { to: newUser.name, type: 'desktopstreamopened', body: { id: r.id, pin: r.pin } })
                    currentDesktopBridges[newUser.location] = { id: r.id, pin: r.pin }
                    context.commit('setCurrentDesktopBridges', currentDesktopBridges)
                    resolve()
                  })
                }
              } else {
                context.dispatch('sendSignal', { to: newUser.name, type: 'desktopstreamopened', body: { id: currentDesktopBridges[newUser.location].id, pin: currentDesktopBridges[newUser.location].pin } })
                context.dispatch('sendPli', context.getters.janusrtpfwd[newUser.location])
                resolve()
              }
            }
          })
        }
      })
    },
    previousTeamSettings (context, payload) {
      context.commit('setInvitationStatus', {
        pending: true,
        accepted: false
      })
      context.commit('setTeamSettings', payload.settings)
      context.commit('setTeamMembers', payload.list)
      context.commit('setInvitationStatus', {
        pending: false,
        accepted: true
      })
    },
    checkTeamName (context, teamname) {
      var reg = new RegExp(/^(\w+)$/)
      context.commit('setTeamNameCheckingStatus', {
        checking: false,
        checked: false,
        valid: false
      })
      if (reg.test(teamname)) {
        if (context.getters['teamNameCheckerTimeout'] != null) clearTimeout(context.getters['teamNameCheckerTimeout'])
        context.commit('setTeamNameCheckerTimeout', setTimeout(() => {
          socketService.emit('checkTeamName', teamname)
          context.commit('setTeamNameCheckingStatus', {
            checking: true,
            checked: false,
            valid: false
          })
        }, 500))
      }
    },
    SOCKET_teamNameInvalid: (context) => {
      context.commit('setTeamNameCheckingStatus', {
        checking: false,
        checked: true,
        valid: false
      })
    },
    SOCKET_teamNameValid: (context) => {
      context.commit('setTeamNameCheckingStatus', {
        checking: false,
        checked: true,
        valid: true
      })
    },
    makeAdmin (context, userName) {
      const me = context.getters['user']
      var admins = cloneDeep(context.getters['teamSettings'].admins)
      if (admins.map(x => x.name).includes(me.name)) {
        socketService.emit('addadmin', {
          username: userName,
          teamname: context.getters['teamSettings'].name
        })

        context.getters['teamMembers'].forEach(teamMember => {
          context.dispatch('sendSignal', {
            type: 'newAdmin',
            body: userName,
            to: teamMember.name
          })
        })
      }
    },
    newAdmin (context, payload) {
      var admins = cloneDeep(context.getters['teamSettings'].admins)
      if (admins.map(x => x.name).includes(payload.from)) {
        const newAdmin = cloneDeep(context.getters['teamMembers']).find(x => x.name === payload.body)
        newAdmin.admin = true
        context.commit('updateTeamMember', newAdmin)
        admins.push(newAdmin)
        context.commit('setTeamAdmin', admins)
        context.commit('addMessageToHistory', {
          type: 'systemMessage',
          body: `User ${payload.body} is now admin`
        })
      }
    }
  },
  getters: {
    teamMembers: (state) => state.teamMembers,
    invitationStatus: (state) => {
      return {
        adminRepliedToPing: state.adminRepliedToPing,
        pending: state.invitationAcceptancePending,
        accepted: state.invitationAccepted
      }
    },
    isRejoining: (state) => state.isRejoining,
    teamSettings: (state) => state.teamSettings,
    teamNameCheckerTimeout: (state) => state.teamNameCheckerTimeout,
    teamNameCheckStatus: (state) => state.teamNameCheckStatus,
    acceptedWait: (state) => state.acceptedWait,
    adminKey: (state) => state.adminKey
  }
})
