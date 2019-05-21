import { mapGetters, mapActions } from 'vuex'
import cookie from 'js-cookie'

export default {
  name: 'join',
  components: {},
  props: [],
  data () {
    return {
      ken: ''
    }
  },
  computed: {
    ...mapGetters([
      'invitationStatus',
      'teamSettings',
      'user'
    ])
  },
  mounted () {
    var ken = this.$route.query.team
    this.ken = ken.split('?')[0]
    if (ken &&
      cookie.getJSON('teamsettings') !== undefined &&
      window.localStorage.getItem('teammembers') &&
      cookie.getJSON('teamsettings').name &&
      cookie.getJSON('teamsettings').admins &&
      cookie.getJSON('teamsettings').admins.length &&
      cookie.getJSON('teamsettings').admins.find(a => a.name === this.user.name) &&
      cookie.getJSON('teamsettings').name.toLowerCase() === this.ken.toLowerCase()) {
      this.previousTeamSettings({
        settings: cookie.getJSON('teamsettings'),
        list: JSON.parse(window.localStorage.getItem('teammembers'))
      })
      this.$router.push({ name: 'team', params: { teamname: cookie.getJSON('teamsettings').name } })
    } else {
      // is not a admin
      if (this.ken) {
        this.sendSymKeyRequest(this.ken)
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
