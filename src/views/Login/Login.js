import { mapGetters, mapActions } from 'vuex'
import copy from 'copy-to-clipboard'
import randomstring from 'randomstring'
import config from '../../../public/static'
import crypto from '../../workers/cryptoWorker'

export default {
  name: 'login',
  components: {},
  props: [],
  data () {
    return {
      valid: true,
      name: '',
      nameRegex: new RegExp(/^(\w+)$/),
      nameRules: [
        v => !!v || 'Name is required',
        v => this.nameRegex.test(v) || 'Name must only contain characters Aa-Zz'
      ],
      privateKey: '',
      embedded3BotUrl: `${config.threebot_frontend}/embeddedlogin?appId=${config.app_id_3bot}`
    }
  },
  computed: {
    ...mapGetters([
      'user',
      'userFetched',
      'userKnownInEmbed'
    ])
  },
  mounted () {
    console.log('adding event listeners')
    window.addEventListener('message', (e) => {
      console.log('Got a message', e.data)
      if (e.data.type === '3botlogin-finished') {
        this.loginWith3BotFinished(e.data.data).then(() => {
          console.log('going to redirect')
          if (this.$route.query.redirect) {
            const redirectTo = this.$route.query.redirect
            const teamName = redirectTo.substr(redirectTo.lastIndexOf('/') + 1, redirectTo.length)
            this.$router.push({ name: 'join', query: { team: teamName } })
          } else {
            this.$router.push({
              name: 'teams'
            })
          }
        })
      } else if (e.data.type === '3botlogin-user-known-alert') {
        this.userIsKnownInEmbed()
      } else if (e.data.type === '3botlogin-request-login-info') {
        this.loginWith3BotEmbedded()
      }
    })
  },
  methods: {
    ...mapActions([
      'fetchUser',
      'setUserName',
      'initWithKey',
      'setSnackbarMessage',
      'userIsKnownInEmbed',
      'loginWith3BotFinished'
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
      console.log('reidentify!')
      this.initWithKey({
        name: this.name,
        privateKey: this.privateKey,
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
    getLoginInfo3Bot () {
      var state = randomstring.generate()
      var scope = 'user:email,user:keys'
      var tempAppKeyPair = crypto.generateCryptoBoxKeyPair()
      return { state, scope, tempAppKeyPair, appId: config.app_id_3bot }
    },
    loginWith3Bot () {
      const info = this.getLoginInfo3Bot()
      var redirectUrl = `${config.threebot_frontend}?state=${info.state}&scope=${info.scope}&appid=${info.app_id_3bot}&publickey=${encodeURIComponent(crypto.b2a(Array.from(info.tempAppKeyPair.publicKey)))}&redirecturl=${encodeURIComponent(config.redirect_url)}`
      window.localStorage.setItem('state', info.state)
      window.localStorage.setItem('tempAppKeyPair', JSON.stringify(info.tempAppKeyPair))
      if (this.$route.query.redirect) { // urlcontains
        redirectUrl += `?redirect=${encodeURIComponent(this.$route.query.redirect)}`
      };
      window.location.href = redirectUrl
    },
    loginWith3BotEmbedded () {
      const info = this.getLoginInfo3Bot()
      window.localStorage.setItem('state', info.state)
      window.localStorage.setItem('tempAppKeyPair', JSON.stringify(info.tempAppKeyPair))

      const iframe = document.getElementById('embeddedlogin').contentWindow
      iframe.postMessage({ type: '3botlogin-info', data: { state: info.state, scope: info.scope, publicKey: crypto.b2a(Array.from(info.tempAppKeyPair.publicKey)) } }, '*')
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
    },
    userKnownInEmbed (val) {
      console.log('hmmm', val)
    }
  }
}
