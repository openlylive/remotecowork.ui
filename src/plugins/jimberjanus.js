import Janus from './janus'
import Axios from 'axios'
import vm from '../main'
import config from '../../public/static'

var timeout = false
var currentBigScreen = 0
var switchDelay = 5000

var cleanup = function () {

}

var isWebrtcSupported = function () {
  return window.RTCPeerConnection !== undefined && window.RTCPeerConnection !== null && navigator.getUserMedia !== undefined && navigator.getUserMedia !== null
}

var isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)

var sendpkg = function (rtpforwardplugin) {
  rtpforwardplugin.send({ 'message': { 'request': 'pli' } })
  rtpforwardplugin.send({ 'message': { 'request': 'fir' } })
  setTimeout(sendpkg, 10000, rtpforwardplugin)
}

function getUniqueStreamInfo (location) {
  return Axios.get(`${config.nodeserver}/uniquestreaminfo/${location}`)
}

export class JimberJanus {
  constructor () {
    Janus.init({
      debug: false,
      callback: function () {
        if (!isWebrtcSupported()) console.error('WebRTC not supported in this browser.')
      }
    })
  }

  createJanus (serverip) {
    var server = `https://${serverip}:8089/janus`
    return new Promise((resolve, reject) => {
      var janus = new Janus({
        // iceServers: [{ url: 'turn:numb.viagenie.ca', username: 'alexander.mol@jimber.org', credential: '!eC4gRCtCl3f' }],
        server: server,
        success: () => {
          resolve(janus)
        }
      })
    })
  }

  createReceiver (janus, receiverip, secret, pin) {
    var streamingplugin = null
    return new Promise((resolve, reject) => {
      janus.attach(
        {
          plugin: 'janus.plugin.streaming',
          opaqueId: 'opaqueId',
          success: function (pluginHandle) {
            streamingplugin = pluginHandle
            streamingplugin.send({
              message: { 'request': 'list' },
              error: (err) => {
                console.error(err)
              },
              success: async (data) => {
                getUniqueStreamInfo(receiverip).then(r => {
                  var nonexistingvideoport = r.data.videoPort
                  var nonexistingaudioport = r.data.audioPort
                  var nonexistingvideortcpport = r.data.videoRtcpPort
                  var nonexistingaudiortcpport = r.data.audioRtcpPort
                  var nonexistingid = r.data.id
                  var payload = {
                    'request': 'create',
                    'type': 'rtp',
                    'id': nonexistingid,
                    'description': `Receiver ${nonexistingid}`,
                    'secret': secret,
                    'pin': pin,
                    // 'is_private': true,
                    'audio': true,
                    'video': true,
                    'audioport': nonexistingaudioport,
                    'videoport': nonexistingvideoport,
                    'audiortcpport': nonexistingaudiortcpport,
                    'videortcpport': nonexistingvideortcpport,
                    'videortpmap': 'H264/90000',
                    'audiortpmap': 'opus/48000/2',
                    'audiopt': 111,
                    'videopt': 100,
                    'videofmtp': 'profile-level-id=42e01f;packetization-mode=1'
                  }
                  pluginHandle.send({ 'message': payload,
                    success: (data) => {
                      cleanup(streamingplugin)
                      resolve({ receiverip: receiverip, 'videoport': nonexistingvideoport, 'audioport': nonexistingaudioport, 'id': nonexistingid, 'secret': secret, 'audioRtcpPort': nonexistingaudiortcpport, 'videoRtcpPort': nonexistingvideortcpport })
                    },
                    error: (e) => {
                      cleanup(streamingplugin)
                    }
                  })
                })
              }
            })
          },
          error: function (error) {
            console.error('  -- Error attaching plugin...', error)
          },
          onmessage: function (msg, jsep) {
            Janus.debug(' ::: Got a message :::')
            Janus.debug(msg)
            if (jsep !== undefined && jsep !== null) {
              Janus.debug('Handling SDP as well...')
              Janus.debug(jsep)
              streamingplugin.handleRemoteJsep({ jsep: jsep })
            }
          },
          slowLink: function (uplink, nacks) {
          },
          oncleanup: function () {
          }
        })
    })
  }

  createRtpFwd (data) {
    var senderendpoint = `https://${data.senderIp}:8089/janus`
    var rtpforwardplugin = null
    return new Promise((resolve, reject) => {
      var janus = new Janus(
        {
          server: senderendpoint,
          success: function () {
            janus.attach(
              {
                plugin: 'janus.plugin.rtpforward',
                success: function (pluginHandle) {
                  rtpforwardplugin = pluginHandle
                  resolve(rtpforwardplugin)
                  // var body = { 'audio': true, 'video': true, 'negotiate_vcodec': 'h264', 'negotiate_acodec': 'opus' }
                  // rtpforwardplugin.send({ 'message': body })
                  // var media = { 'audioRecv': false, 'videoRecv': false, 'audioSend': true, 'videoSend': true }

                  // if(data.desktop) media['video'] = 'window'
                  // rtpforwardplugin.createOffer(
                  //   {
                  //     media: media,
                  //     success: function (jsep) {
                  //       rtpforwardplugin.send({ 'message': body, 'jsep': jsep })
                  //     },
                  //     error: function (error) {
                  //     }
                  //   })
                },
                error: function (error) {
                  console.error('  -- Error attaching plugin...', error)
                },
                iceState: function (state) {
                },
                mediaState: function (medium, on) {
                },
                webrtcState: function (on) {
                },
                slowLink: function (uplink, nacks) {
                  // rtpforwardplugin.send({ 'message': { 'request': 'remb', 'bitrate': 256000 } })
                },
                onmessage: function (msg, jsep) {
                  if (jsep !== undefined && jsep !== null) {
                    rtpforwardplugin.handleRemoteJsep({ jsep: jsep })
                  }
                },
                onlocalstream: function (stream) {
                  if (!data.desktop) {
                  //   Janus.attachMediaStream(document.getElementById('localstream'), stream)
                    rtpforwardplugin.send({ 'message': { 'request': 'remb', 'bitrate': 128000 } })
                  // } else {
                  //   // rtpforwardplugin.send({ 'message': { 'request': 'remb', 'bitrate': 512000 } })
                  }
                },
                oncleanup: function () {
                }
              })
          },
          error: function (error) {
            console.error(error)
            cleanup(rtpforwardplugin)
            // window.location.reload()
          },
          destroyed: function () {
            cleanup(rtpforwardplugin)
            // window.location.reload()
          }
        })
    })
  }

  createSender (rtpfwd, senderIp, receiverIp, videoport, audioport, audioRtcpPort, videoRtcpPort, secret, desktop) {
    return new Promise((resolve, reject) => {
      Axios.post(`${config.nodeserver}/lookup`, { 'url': receiverIp }).then(r => {
        var rtpforward = { 'request': 'configure', 'sendipv4': r.data.ip, 'sendport_audio_rtp': audioport, 'sendport_audio_rtcp': audioRtcpPort, 'sendport_video_rtp': videoport, 'sendport_video_rtcp': videoRtcpPort, 'secret': secret, 'negotiate_acodec': 'opus', 'negotiate_vcodec': 'h264' }
        rtpfwd.send({ 'message': rtpforward,
          success: (data) => {
            var body = { 'audio': true, 'video': true, 'negotiate_vcodec': 'h264', 'negotiate_acodec': 'opus' }
            rtpfwd.send({ 'message': body })
            var media = { 'audioRecv': false, 'videoRecv': false, 'audioSend': true, 'videoSend': true }

            if (desktop) media['video'] = 'window'

            var offerObject = {
              media: media,
              success: function (jsep) {
                rtpfwd.send({ 'message': body, 'jsep': jsep })
                resolve()
              },
              error: function (error) {
                console.error(error)
                if (desktop) vm.$store.dispatch('toggleScreenShare')
                resolve()
              }
            }

            if (document.getElementById('localstream').srcObject && !desktop) {
              offerObject.stream = document.getElementById('localstream').srcObject
            }

            rtpfwd.createOffer(offerObject)
            setTimeout(() => {
              sendpkg(rtpfwd)
            }, 3000)
          },
          error: (e) => {
          }
        })
      })
    })
  }

  createStreamPlugin (janus, server) {
    return new Promise((resolve, reject) => {
      var streaming = null
      janus.attach(
        {
          plugin: 'janus.plugin.streaming',
          success: function (pluginHandle) {
            resolve(pluginHandle)
            streaming = pluginHandle
          },
          error: function (error) {
            Janus.error('  -- Error attaching plugin... ', error)
          },
          onmessage: function (msg, jsep) {
            if (jsep !== undefined && jsep !== null) {
              var answerObject =
              {
                jsep: jsep,
                media: { audio: false, video: false, audioSend: false, videoSend: false },
                success: function (jsep) {
                  var body = { 'request': 'start' }
                  streaming.send({ 'message': body, 'jsep': jsep })
                },
                error: function (error) {
                  Janus.error('WebRTC error:', error)
                },
                stream: document.getElementById('localstream').srcObject
              }

              if (document.getElementById('localstream').srcObject) {
                answerObject.stream = document.getElementById('localstream').srcObject
              }

              streaming.createAnswer(answerObject)
            }
          },
          slowLink: function (uplink, nacks) {
          },
          oncleanup: function () {
          },
          iceState: function (state) {
            if (state === 'checking' && isSafari && !window.navigator.userAgent.match(/iPad/i) && !window.navigator.userAgent.match(/iPhone/i)) {
              navigator.mediaDevices.getUserMedia({ audio: true, video: true }).then((stream) => {
                console.log('got stream in safari')
              }).catch(e => {
                console.log("couldn't get stream in safari", e)
              })
            }
            console.log('iceState ', state)
          },
          mediaState: function (medium, on) {
          },
          webrtcState: function (on) {
          }
        })
    })
  }

  getStream (streaming, id, pin, desktop) {
    var body = { 'request': 'watch', id: parseInt(id), pin: pin }
    id = desktop ? 'bigScreen' : id
    streaming.onremotestream = function (stream) {
      Janus.debug(' ::: Got a remote rtp forward stream :::')
      Janus.debug(stream)
      if (!desktop) {
        var AudioContext = window.AudioContext || window.webkitAudioContext || false
        let audioContext = new AudioContext()
        if (audioContext) {
          let analyser = audioContext.createAnalyser()
          let microphone = audioContext.createMediaStreamSource(stream)
          let javascriptNode = audioContext.createScriptProcessor(2048, 1, 1)

          analyser.smoothingTimeConstant = 0.8
          analyser.fftSize = 1024

          microphone.connect(analyser)
          analyser.connect(javascriptNode)
          javascriptNode.connect(audioContext.destination)
          javascriptNode.onaudioprocess = function () {
            var array = new Uint8Array(analyser.frequencyBinCount)
            analyser.getByteFrequencyData(array)
            var values = 0

            var length = array.length
            for (var i = 0; i < length; i++) {
              values += (array[i])
            }

            var average = values / length
            if (average > 20) {
              if (currentBigScreen !== id && !timeout) {
                currentBigScreen = id
                timeout = true
                setTimeout(() => {
                  timeout = false
                }, switchDelay)
                if (!vm.$store.getters.someoneScreenSharing) {
                  vm.$store.dispatch('isMakingNoise', id)
                  vm.$store.dispatch('setBigscreenStream', { desktop: desktop, stream: stream })
                }
              }
            }
          }
        }
      }
      if (!vm.$store.getters.someoneScreenSharing) {
        vm.$store.dispatch('isMakingNoise', id)
        vm.$store.dispatch('setBigscreenStream', { desktop: desktop, stream: stream })
      }
      if (document.getElementById(id)) {
        Janus.attachMediaStream(document.getElementById(id), stream)
        setInterval(function () {
          if (document.getElementById(id) && document.getElementById(id).readyState === 0) {
            Janus.attachMediaStream(document.getElementById(id), stream)
          }
        }, 30000)
      }
    }
    streaming.send({ 'message': body,
      success: (data) => {
        console.log('success', data)
      },
      error: (e) => {
        console.log(e)
      }
    })
  }
}
