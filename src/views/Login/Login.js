import { mapGetters, mapActions } from 'vuex'
import copy from 'copy-to-clipboard'
import randomstring from 'randomstring'
import config from '../../../public/static'

export default {
  name: 'login',
  components: {},
  props: [],
  data () {
    return {
      valid: true,
      name: '',
      nameRegex: new RegExp(/^(\w+\.\w+)$/),
      nameRules: [
        v => !!v || 'Name is required',
        v => this.nameRegex.test(v) || 'Name must contain 2 sections separated by a dot'
      ],
      privateKey: ''
    }
  },
  computed: {
    ...mapGetters([
      'user',
      'userFetched'
    ])
  },
  mounted () {
    window.addEventListener('message', (e) => {
      if (e.data.type === '3botlogin-finished') {
        this.loginWith3BotFinished(e.data.data)
      }
    })
  },
  methods: {
    ...mapActions([
      'fetchUser',
      'setUserName',
      'initWithKey',
      'setSnackbarMessage'
    ]),
    sendName (e) {
      e.preventDefault()
      this.fetchUser(this.name)
    },
    identify (e) {
      e.preventDefault()
      this.setUserName({
        name: this.name
      })
    },
    restartLogin () {
      this.userFetched.ready = false
      this.userFetched.found = false
    },
    reidentify (e) {
      e.preventDefault()
      var teamName = null
      if (this.$route.query && this.$route.query.redirect) {
        const redirectTo = this.$route.query.redirect
        const params = new URLSearchParams(redirectTo.substr(redirectTo.indexOf('?'), redirectTo.length))
        teamName = params.get('team')
        if (!teamName) {
          teamName = redirectTo.substr(redirectTo.lastIndexOf('/') + 1, redirectTo.length)
        }
      }
      this.initWithKey({
        name: this.name,
        key: this.privateKey,
        teamName: teamName
      })
    },
    copyKey () {
      if (this.privateKey) {
        copy(this.privateKey)
        this.setSnackbarMessage(`Copied key to clipboard`)
      } else {
        this.setSnackbarMessage(`Can't copy if I don't have it`)
      }
    },
    loginWith3Bot () {
      var state = randomstring.generate()
      // var keys = await CryptoService.generateKeys(config.seedPhrase)
      var appid = 'RemoteWork'
      var scope = 'user:derivativekey'
      var publicKey = 'xKHlaIyza5dSxswOmvuYV7MDreIbLllK9T0n3c1tu0g='
      window.localStorage.setItem('state', state)
      //        window.location.href = `${config.botForntEnd}?state=${state}&scope=${scope}&appid=${appid}&publickey=${encodeURIComponent(CryptoService.getEdPkInCurve(keys.publicKey))}&redirecturl=${config.redirect_url}/callback`
      var urlleke = `${config.threebot_frontend}?state=${state}&scope=${scope}&appid=${appid}&publickey=${publicKey}&redirecturl=${encodeURIComponent(config.redirect_url)}`
      console.log(urlleke)
      let w = 400
      let h = 500
      var dualScreenLeft = window.screenLeft !== undefined ? window.screenLeft : window.screenX
      var dualScreenTop = window.screenTop !== undefined ? window.screenTop : window.screenY
      var width = window.innerWidth ? window.innerWidth : document.documentElement.clientWidth ? document.documentElement.clientWidth : screen.width
      var height = window.innerHeight ? window.innerHeight : document.documentElement.clientHeight ? document.documentElement.clientHeight : screen.height
      var systemZoom = width / window.screen.availWidth
      var left = ((width - w) / 2 / systemZoom + dualScreenLeft) - w / 2
      var top = (height - h) / 2 / systemZoom + dualScreenTop
      window.open(`${urlleke}`, 'popUpWindow', `left=${left},top=${top},height=500,width=400,resizable=no,scrollbars=no,toolbar=no,menubar=no,location=no,directories=no,status=yes`)
    },
    loginWith3BotFinished (data) {
      console.log('login with 3bot finished!', data)
      this.name = data.username
    }
  },
  watch: {
    user: {
      handler: function (val) {
        if (val.privateKey) {
          this.privateKey = val.privateKey
        }
        if (val.name && val.privateKey) {
          if (this.$route.query.redirect) {
            const redirectTo = this.$route.query.redirect
            var teamName = redirectTo.substr(redirectTo.lastIndexOf('/') + 1, redirectTo.length)
            this.$router.push({ name: 'join', query: { team: teamName } })
          } else {
            this.$router.push({
              name: 'teams'
            })
          }
        }
      },
      immediate: true,
      deep: true
    },
    userFetched (val) {
      if (val && val.ready && val.found) {
        this.privateKey = ''
      } else if (val && val.ready && !val.found) {
        this.$store.dispatch('init')
      }
    }
  }
}
