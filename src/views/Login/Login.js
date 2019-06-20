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
    // window.addEventListener('message', (e) => {
    //   if (e.data.type === '3botlogin-finished') {
    //     this.loginWith3BotFinished(e.data.data)
    //   }
    // })
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
    loginWith3Bot () {
      var state = randomstring.generate()
      var scope = 'user:email'
      var tempAppKeyPair = crypto.generateCryptoBoxKeyPair()
      window.localStorage.setItem('state', state)
      window.localStorage.setItem('tempAppKeyPair', JSON.stringify(tempAppKeyPair))

      var redirectUrl = `${config.threebot_frontend}?state=${state}&scope=${scope}&appid=${config.app_id_3bot}&publickey=${encodeURIComponent(crypto.b2a(Array.from(tempAppKeyPair.publicKey)))}&redirecturl=${encodeURIComponent(config.redirect_url)}`

      if (this.$route.query.redirect) { // urlcontains
        console.log('redirect found!')
        redirectUrl += `?redirect=${encodeURIComponent(this.$route.query.redirect)}`
      };
      // var urlleke = `${config.threebot_frontend}?state=${state}&scope=${scope}&appid=${config.app_id_3bot}&publickey=${encodeURIComponent(crypto.b2a(Array.from(tempAppKeyPair.publicKey)))}&redirecturl=${encodeURIComponent(config.redirect_url)}?redirect`
      // var urlleke = `${config.threebot_frontend}?state=${state}&scope=${scope}&appid=%3Ch1%3Etes%3C%2Fh1%3E&publickey=${encodeURIComponent(crypto.b2a(Array.from(tempAppKeyPair.publicKey)))}&redirecturl=${encodeURIComponent(config.redirect_url)}?redirect`

      console.log(redirectUrl)
      // window.open(`${urlleke}`, 'popUpWindow', `left=2200,top=300,height=500,width=400,resizable=no,scrollbars=no,toolbar=no,menubar=no,location=no,directories=no,status=yes`)
      window.location.href = redirectUrl
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
