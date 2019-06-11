import { mapGetters, mapActions } from 'vuex'
import cookie from 'js-cookie'

export default {
  name: 'join',
  components: {},
  props: [],
  data () {
    return {}
  },
  computed: {
    ...mapGetters([
      'invitationStatus',
      'teamSettings',
      'user',
      'teamAdminsAvailable'
    ]),
    isAdmin () {
      let tuce = false
      try {
        tuce = cookie.getJSON('teamsettings').admins.some(a => a.name === this.user.name)
      } catch (e) {
        tuce = false
      }
      return tuce
    }
  },
  mounted () {
    if (this.$route.query.team &&
      cookie.getJSON('teamsettings') !== undefined &&
      window.localStorage.getItem('teammembers') &&
      cookie.getJSON('teamsettings').name &&
      cookie.getJSON('teamsettings').admins &&
      cookie.getJSON('teamsettings').admins.length &&
      cookie.getJSON('teamsettings').admins.find(a => a.name === this.user.name) &&
      cookie.getJSON('teamsettings').name.toLowerCase() === this.$route.query.team.toLowerCase()) {
      this.previousTeamSettings({
        settings: cookie.getJSON('teamsettings'),
        list: JSON.parse(window.localStorage.getItem('teammembers'))
      })
      this.$router.push({ name: 'team', params: { teamname: cookie.getJSON('teamsettings').name } })
    } else {
      // is not a admin
      if (this.$route.query.team) {
        this.sendPingAdmins(this.$route.query.team).then(() => {
          this.sendSymKeyRequest(this.$route.query.team)
          var requestInterval = setInterval(() => {
            console.log(`Admin replied: ${this.invitationStatus.adminRepliedToPing}`)
            if (this.invitationStatus.adminRepliedToPing) {
              clearInterval(requestInterval)
            } else {
              this.sendPingAdmins(this.$route.query.team)
              this.sendSymKeyRequest(this.$route.query.team)
            }
          }, 3000)
        })
      }
    }
  },
  methods: {
    ...mapActions([
      'setSnackbarMessage',
      'sendSymKeyRequest',
      'sendPingAdmins',
      'previousTeamSettings'
    ])
  },
  watch: {
    invitationStatus (val) {
      if (!val.pending && val.accepted) {
        this.$router.push({
          name: 'team',
          params: {
            teamname: this.$route.query.team
          }
        })
      }
    }
  }
}
