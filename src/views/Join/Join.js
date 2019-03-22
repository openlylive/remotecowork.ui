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
      'user'
    ])
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
        this.sendSymKeyRequest(this.$route.query.team)
      }
    }
  },
  methods: {
    ...mapActions([
      'setSnackbarMessage',
      'sendSymKeyRequest',
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
