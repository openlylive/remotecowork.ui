import { mapActions, mapGetters } from 'vuex'
import copy from 'copy-to-clipboard'
import { Picker } from 'emoji-mart-vue'
export default {
  name: 'team',
  components: {
    Picker
  },
  props: [],
  data () {
    return {
      bitrates: [ { bitrate: 0, text: 'Unlimited' },
        { bitrate: 128, text: 'Cap to 128 kbit' },
        { bitrate: 256, text: 'Cap to 256 kbit' },
        { bitrate: 512, text: 'Cap to 512 kbit' },
        { bitrate: 1024, text: 'Cap to 1024 kbit' },
        { bitrate: 1500, text: 'Cap to 1500 kbit' },
        { bitrate: 2000, text: 'Cap to 2000 kbit' } ],
      select: { bitrate: 256, text: 'Cap to 256 kbit' },
      bitrate: { bitrate: 256, text: 'Cap to 256 kbit' },
      showEmojis: false,
      showShare: false,
      showChat: false,
      camera: null,
      inputName: '',
      valid: false,
      nameRules: [
        v => !!v || 'Name is required',
        v => (v && v.length >= 3 && v.length <= 20) || 'Name must be between 3 and 20 characters'
      ],
      message: '',
      activeSideTab: null,
      timeOutChecker: null,
      chatMessageKey: 1,
      dialogSelectBitrate: false,
      selectedMember: {}
    }
  },
  computed: {
    ...mapGetters([
      'user',
      'teamMembers',
      'messages',
      'janusrtpfwd',
      'audioMuted',
      'videoMuted',
      'screensharing',
      'someoneScreenSharing',
      'localJanusLocation',
      'noiseMaker',
      'teamSettings'
    ]),
    link () {
      var base = `${window.location.protocol}//${window.location.host}`
      if (!base.endsWith('/')) base += '/'
      return `${base}teams/${this.$route.params.teamname.toLowerCase()}`
    },
    randomHint () {
      switch (Math.floor((Math.random() * 5))) {
        case 0:
          return 'Shift + return = new line'
        case 1:
          return 'Styling with Markdown is supported'
        case 2:
          return 'Try our emojis'
        case 3:
          return 'Be kind to everyone'
        case 4:
          return 'Messages are E2E encrypted'
      }
    }
  },
  mounted () {
    if (this.$vuetify.breakpoint.smAndUp) this.showChat = true
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
        this.setLocalStream(stream)
        document.getElementById('localstream').srcObject = stream
        this.addJanus(this.localJanusLocation).then(x => {
          this.addJanusRtpFwd({ location: (this.localJanusLocation) }).then(r => {
            this.sendInitialized()
          })
        })
      }).catch(e => {
        console.log('Error when getting media', e)
      })
    }
  },
  beforeDestroy () {
    this.closeStreams()
    this.leaveTeam()
  },
  methods: {
    ...mapActions([
      'setSnackbarMessage',
      'addJanusRtpFwd',
      'toggleAudio',
      'toggleVideo',
      'leaveTeam',
      'sendInitialized',
      'previousTeamSettings',
      'sendMessageToEveryone',
      'addJanus',
      'setBitrate',
      'toggleScreenShare',
      'setBigscreenStream',
      'getBestLocation',
      'closeStreams',
      'setLocalStream'
    ]),
    selectBitrate () {
      this.bitrate = this.select
      this.setBitrate(this.select)
      this.dialogSelectBitrate = false
    },
    resetSelectBitrate () {
      this.select = this.bitrate
      this.dialogSelectBitrate = false
    },
    invite () {
      if (navigator.share) {
        navigator.share({
          title: 'Remote cowork invitation',
          text: 'Come and have a call in our team',
          url: window.location.href
        })
      } else {
        this.showShare = true
      }
    },
    copyUrl () {
      this.showShare = false
      copy(this.link)
      this.setSnackbarMessage(`Url copied to clipboard`)
    },
    checkAndSendMessage (e) {
      if (this.message && this.message.trim()) {
        this.sendMessageToEveryone(this.message)
        this.message = ''
        this.chatMessageKey++
      }
    },
    leave () {
      this.leaveTeam().then(x => this.$router.push({ name: 'teams' }))
    },
    emojiSelection (emoji) {
      this.message += emoji.colons
      this.showEmojis = false
    },
    showInbigScreen (tm) {
      if (tm.streamId && document.getElementById(tm.streamId.toString()) && document.getElementById(tm.streamId.toString()).srcObject) {
        this.setBigscreenStream({ desktop: false, stream: document.getElementById(tm.streamId.toString()).srcObject })
      }
    }
  },
  watch: {
    noiseMaker (val) {
      if (val) {
        this.showInbigScreen(val)
      }
    }
  }
}
