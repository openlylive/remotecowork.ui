import Vue from 'vue'
import Vuex from 'vuex'
import { JimberJanus } from '../plugins/jimberjanus'
import { v4 } from 'uuid'
import socketService from '../services/socketService'
import Axios from 'axios'
import groupBy from 'lodash/groupBy'
import cloneDeep from 'lodash/cloneDeep'
import config from '../../public/static'

Vue.use(Vuex)

export default ({
  state: {
    jimberjanus: new JimberJanus(),
    janus: {},
    janusrtpfwd: {},
    janusrtpfwddesktop: {},
    janusstreamingplugin: {},
    isAudioMuted: false,
    isVideoMuted: false,
    screensharing: false,
    someoneScreenSharing: false,
    localJanusLocation: null,
    noiseMaker: {},
    locations: [],
    currentBridges: {},
    currentDesktopBridges: {},
    localStream: undefined
  },
  mutations: {
    addJanus: (state, payload) => {
      state.janus[payload.location] = payload.janus
    },
    addJanusRtpFwd: (state, payload) => {
      state.janusrtpfwd[payload.location] = payload.rtpfwd
    },
    setJanusRtpFwd: (state, payload) => {
      state.janusrtpfwd = payload
    },
    addJanusRtpFwdDesktop: (state, payload) => {
      state.janusrtpfwddesktop[payload.location] = payload.rtpfwd
    },
    setJanusRtpFwdDesktop: (state, payload) => {
      state.janusrtpfwddesktop = payload
    },
    addJanusStreamingplugin: (state, payload) => {
      state.janusstreamingplugin[payload.user] = payload.streamingplugin
    },
    setAudioMuted: (state, muted) => {
      state.isAudioMuted = muted
    },
    setVideoMuted: (state, muted) => {
      state.isVideoMuted = muted
    },
    setScreenShare: (state, payload) => {
      state.screensharing = payload
    },
    setSomeoneScreenSharing: (state, payload) => {
      state.someoneScreenSharing = payload
    },
    setLocalJanusLocation: (state, payload) => {
      window.localStorage.setItem('JanusLocation', payload)
      state.localJanusLocation = payload
    },
    setNoiseMaker (state, noiseMaker) {
      if (noiseMaker) { state.noiseMaker = noiseMaker }
    },
    setLocations (state, locations) {
      state.locations = locations
    },
    setCurrentBridges (state, bridges) {
      state.currentBridges = bridges
    },
    setCurrentDesktopBridges (state, bridges) {
      state.currentDesktopBridges = bridges
    },
    setLocalStream (state, localStream) {
      state.localStream = localStream
    }
  },
  actions: {
    closeStreams: (context) => {
      var rtpfwds = context.getters.janusrtpfwd
      var desktoprtpfwds = context.getters.janusrtpfwddesktop
      var janusstreamingplugins = context.getters.janusstreamingplugin
      Object.values(rtpfwds).forEach(rtpfwd => {
        rtpfwd.hangup()
        rtpfwd.detach()
      })
      Object.values(desktoprtpfwds).forEach(rtpfwd => {
        rtpfwd.hangup()
        rtpfwd.detach()
      })
      if (context.getters.localStream) {
        var tracks = context.getters.localStream.getTracks()
        tracks.forEach(track => {
          track.stop()
        })
      }
      context.commit('setJanusRtpFwd', {})
      context.commit('setJanusRtpFwdDesktop', {})
      context.commit('setCurrentBridges', {})
      context.commit('setCurrentBridges', {})
      context.commit('setCurrentDesktopBridges', {})
      context.commit('setCurrentDesktopBridges', {})

      Object.values(desktoprtpfwds).forEach(rtpfwd => {
        rtpfwd.hangup()
        rtpfwd.detach()
      })
      Object.values(janusstreamingplugins).forEach(streamingplugin => { // TODO close on janus server and send to nodeserver to cleanup
        streamingplugin.hangup()
        streamingplugin.detach()
      })
    },
    setLocalStream: (context, localStream) => {
      context.commit('setLocalStream', localStream)
    },
    sendPli: (context, rtpfwd) => {
      rtpfwd.send({ 'message': { 'request': 'pli' } })
      rtpfwd.send({ 'message': { 'request': 'fir' } })
    },
    setBigscreenStream: (context, data) => {
      if (document.getElementById('bigScreen')) document.getElementById('bigScreen').srcObject = data.stream
    },
    fixBigscreenStream: (context, data) => {
      var teamMembers = context.getters.teamMembers.filter(t => t.online && t.name !== context.getters.user.name)
      if (teamMembers.length > 0) {
        context.commit('setNoiseMaker', teamMembers[0])
        context.dispatch('setBigscreenStream', { stream: document.getElementById(teamMembers[0].streamId).srcObject, desktop: false })
      }
    },
    getAllLocations: (context, data) => {
      Axios.get(`${config.nodeserver}/locations`).then(async locationsresponse => {
        context.commit('setLocations', locationsresponse.data)
      })
    },
    getBestLocation: (context, data) => {
      return new Promise(async (resolve, reject) => {
        if (context.getters.setLocalJanusLocation) {
          resolve(context.getters.localJanusLocation)
        } else {
          var locations = context.getters.locations
          var fastest = {}
          for (var location of locations) {
            var startTime = new Date()
            await Axios.get(`https://${location}:8089/speedtest/${v4()}`).then(fileresponse => {
              let time = new Date() - startTime
              if (!fastest.time || time < fastest.time) {
                fastest.time = time
                fastest.location = location
              }
            }).catch(e => {

            })
          }
          resolve(fastest.location)
        }
      })
    },
    setLocalJanusLocation: (context, data) => {
      context.commit('setLocalJanusLocation', data)
    },
    addJanusRtpFwd: (context, data) => {
      return new Promise((resolve, reject) => {
        context.getters['jimberjanus'].createRtpFwd({ senderIp: context.getters.localJanusLocation, desktop: data.desktop }).then(r => {
          if (data.desktop) {
            context.commit('addJanusRtpFwdDesktop', { location: data.location, rtpfwd: r })
          } else {
            context.commit('addJanusRtpFwd', { location: data.location, rtpfwd: r })
          }
          resolve('')
        })
      })
    },
    addJanus: (context, data) => {
      return new Promise((resolve, reject) => {
        var janus = context.getters['janus'][data]
        if (janus) {
          resolve(janus)
        } else {
          context.getters['jimberjanus'].createJanus(data).then(r => {
            context.commit('addJanus', { location: data, janus: r })
            resolve(r)
          })
        }
      })
    },
    createJanusBridge: (context, data) => {
      return new Promise((resolve, reject) => {
        var jimberjanus = context.getters['jimberjanus']
        var secret = v4()
        var pin = v4()
        context.dispatch('addJanus', data.receiverIp).then(x => {
          jimberjanus.createReceiver(x, data.receiverIp, secret, pin).then(r => {
            var jimberjanus = context.getters['jimberjanus']
            var domainname = context.getters.localJanusLocation
            jimberjanus.createSender(context.getters[`janusrtpfwd${data.desktop ? 'desktop' : ''}`][data.receiverIp], domainname, data.receiverIp, r.videoport, r.audioport, r.audioRtcpPort, r.videoRtcpPort, r.secret, data.desktop).then(y => {
              var body = {}
              body[domainname] = { audioPort: r.audioport, videoPort: r.videoport, videoRtcpPort: r.videoRtcpPort, audioRtcpPort: r.audioRtcpPort, id: r.id }
              Axios.put(`${config.nodeserver}/users/${context.getters.user.name}/streams`, body)
              resolve({ id: r.id, pin: pin })
            })
          })
        })
      })
    },
    createJanusBridgeAndSendStreamOpened: (context, payload) => {
      return new Promise((resolve, reject) => {
        var currentBridges = payload.desktop ? context.getters.currentDesktopBridges : context.getters.currentBridges
        context.dispatch('createJanusBridge', { receiverIp: payload.location, desktop: payload.desktop }).then(r => {
          payload.userList.forEach(user => {
            if (user.name !== context.getters.user.name) {
              context.dispatch('sendSignal', { to: user.name, type: `${payload.desktop ? 'desktop' : ''}streamopened`, body: { id: r.id, pin: r.pin } })
            }
          })
          currentBridges[payload.location] = { id: r.id, pin: r.pin }
          if (!payload.desktop) context.commit('setCurrentBridges', currentBridges)
          else context.commit('setCurrentDesktopBridges', currentBridges)
          resolve()
        }).catch(e => {
          console.log(e)
          resolve()
        })
      })
    },
    sendInitialized: (context) => {
      var admins = context.getters.teamSettings.admins
      if (admins && admins.length) {
        const me = context.getters['user']
        if (admins.find(t => t.name === me.name) && !admins.some(x => x.name !== me.name)) {
          socketService.sendSignal({ to: me.name, type: 'userInitialized', body: '' })
        } else {
          socketService.sendSignal({ to: admins[0].name, type: 'userInitialized', body: '' })
        }
      }
    },
    getStream: (context, data) => {
      var jimberjanus = context.getters['jimberjanus']
      context.dispatch('addJanus', context.getters.localJanusLocation).then(r => {
        jimberjanus.getStream(data.streaming, data.id, data.pin, data.desktop)
      })
    },
    streamopened: (context, payload) => {
      var teamMembers = context.getters['teamMembers']
      var info = payload.body
      var teammember = teamMembers.find(teammember => teammember.name === payload.from)
      if (teammember) {
        if (context.getters['janusstreamingplugin'][teammember.name]) { // TODO teammember.name and on disconnect cleanup janus
          if (!payload.desktop) teammember.streamId = info.id
          context.commit('setTeamMembers', teamMembers)
          context.dispatch('getStream', { streaming: context.getters['janusstreamingplugin'][teammember.name], id: info.id, pin: info.pin, desktop: payload.desktop })
        } else {
          var server = `https://${(context.getters.localJanusLocation)}:8089/janus`
          context.dispatch('addJanus', (context.getters.localJanusLocation)).then(x => {
            context.getters['jimberjanus'].createStreamPlugin(x, server).then(r => {
              context.commit('addJanusStreamingplugin', { streamingplugin: r, user: payload.from })

              if (!payload.desktop) teammember.streamId = info.id
              context.commit('updateTeamMember', teammember)
              context.dispatch('getStream', { streaming: r, id: info.id, pin: info.pin, desktop: payload.desktop })
            })
          })
        }
      }
    },
    desktopstreamopened: (context, payload) => {
      context.commit('setSomeoneScreenSharing', payload.from)
      var noiseMaker = context.getters.teamMembers.find(t => t.name === payload.from && t.online)
      context.commit('setNoiseMaker', noiseMaker)
      payload.desktop = true
      context.dispatch('streamopened', payload)
    },
    desktopstreamstopped: (context, payload) => {
      if (payload.from !== context.getters.user.name && context.getters.someoneScreenSharing === payload.from) { context.dispatch('fixBigscreenStream') }
      context.commit('setSomeoneScreenSharing', false)
    },
    sendDesktopStreamStopped: (context, payload) => {
      context.commit('setCurrentDesktopBridges', {})
      context.getters.teamMembers.forEach(teamMember => {
        context.dispatch('sendSignal', { to: teamMember.name, type: 'desktopstreamstopped', body: { username: context.getters.user.name } })
      })
    },
    toggleVideo: (context, payload) => {
      var rtpfwd = context.getters['janusrtpfwd'][context.getters.localJanusLocation]
      if (rtpfwd.isVideoMuted()) {
        context.commit('setVideoMuted', false)
        rtpfwd.unmuteVideo()
      } else {
        context.commit('setVideoMuted', true)
        rtpfwd.muteVideo()
      }
    },
    toggleAudio: (context, payload) => {
      var rtpfwd = context.getters['janusrtpfwd'][context.getters.localJanusLocation]
      if (rtpfwd.isAudioMuted()) {
        context.commit('setAudioMuted', false)
        rtpfwd.unmuteAudio()
      } else {
        context.commit('setAudioMuted', true)
        rtpfwd.muteAudio()
      }
    },
    setBitrate: (context, payload) => {
      var rtpfwd = context.getters['janusrtpfwd'][context.getters.localJanusLocation]
      rtpfwd.send({ 'message': { 'request': 'remb', 'bitrate': payload * 1000 } })
    },
    toggleScreenShare: (context, payload) => {
      if (context.getters.screensharing) {
        context.commit('setScreenShare', false)
        context.dispatch('sendDesktopStreamStopped')
      } else {
        if (context.getters.someoneScreensharing) {
          context.commit('setErrorMessage', { text: `Someone else is already sharing his screen.` })
        } else {
          context.dispatch('addJanus', context.getters.localJanusLocation).then(x => {
            if (x.isExtensionEnabled()) {
              context.commit('setScreenShare', true)
              var teamMembers = context.getters.teamMembers
              var localUser = context.getters.user
              var filtered = teamMembers.filter(t => t.name !== localUser.name)
              var locations = groupBy(filtered, 'location')

              for (var location of Object.keys(locations)) {
                const loc = cloneDeep(location)
                if (!context.getters.janusrtpfwddesktop[loc]) {
                  context.dispatch('addJanusRtpFwd', { location: loc, desktop: true }).then(r => {
                    context.dispatch('createJanusBridgeAndSendStreamOpened', { userList: locations[loc], location: loc, desktop: true })
                  })
                } else {
                  context.dispatch('createJanusBridgeAndSendStreamOpened', { userList: locations[loc], location: loc, desktop: true })
                }
              }
            } else {
              context.commit('setErrorMessage', { text: `For screensharing in Chrome, you should install the Janus WebRTC Extension: https://chrome.google.com/webstore/detail/janus-webrtc-screensharin/hapfgfdkleiggjjpfpenajgdnfckjpaj?hl=en` })
            }
          })
        }
      }
    },
    isMakingNoise (context, streamId) {
      var noiseMaker = context.getters['teamMembers'].find(tm => tm.online && tm.streamId === streamId)
      context.commit('setNoiseMaker', noiseMaker)
    }
  },
  getters: {
    janus: (state) => (state.janus),
    jimberjanus: (state) => (state.jimberjanus),
    janusrtpfwd: (state) => state.janusrtpfwd,
    janusrtpfwddesktop: (state) => state.janusrtpfwddesktop,
    janusstreamingplugin: (state) => state.janusstreamingplugin,
    audioMuted: (state) => state.isAudioMuted,
    videoMuted: (state) => state.isVideoMuted,
    screensharing: (state) => state.screensharing,
    someoneScreenSharing: (state) => state.someoneScreenSharing,
    localJanusLocation: (state) => state.localJanusLocation,
    noiseMaker: (state) => state.noiseMaker,
    locations: (state) => state.locations,
    currentBridges: (state) => state.currentBridges,
    currentDesktopBridges: (state) => state.currentDesktopBridges,
    localStream: (state) => state.localStream
  }
})
