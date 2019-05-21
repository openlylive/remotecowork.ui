import { mapGetters, mapActions } from 'vuex'
import copy from 'copy-to-clipboard'
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
      privateKey: '',
      loginWith3Bot: false
    }
  },
  computed: {
    ...mapGetters([
      'user',
      'userFetched'
    ])
  },
  mounted () {
    if (this.$route.query.threebotname) {
      this.loginWith3Bot = true
      // this.setUserName(this.$route.query.threebotname);
      // this.$router.push({"name": "teams"});
      this.setLoginWith3bot(true)
      this.fetchUser(this.$route.query.threebotname).then(r => {
      })
    }
  },
  methods: {
    ...mapActions([
      'fetchUser',
      'setUserName',
      'initWithKey',
      'setSnackbarMessage',
      'setLoginWith3bot'
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
            console.log('wezienweg')
            const redirectTo = this.$route.query.redirect
            var teamName = redirectTo.substr(redirectTo.lastIndexOf('/') + 1, redirectTo.length)
            this.$router.push({ name: 'join', query: { team: teamName } })
          } else {
            console.log('wezienweg2')
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
        this.$store.dispatch('init', this.$route.query.threebotname)
      }
    }
  }
}
