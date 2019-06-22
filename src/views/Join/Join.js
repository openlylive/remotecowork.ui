import { mapGetters, mapActions } from 'vuex'
import crypto from '../../workers/cryptoWorker'

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
        tuce = window.localStorage.getItem('teamsettings').admins.some(a => a.name === this.user.name)
      } catch (e) {
        tuce = false
      }
      return tuce
    }
  },
  mounted () {
    const teamSettings = JSON.parse(window.localStorage.getItem('teamsettings'))
    console.log(teamSettings)
    if (this.$route.query.team &&
      teamSettings !== undefined &&
      teamSettings &&
      teamSettings.name &&
      teamSettings.admins &&
      teamSettings.admins.length &&
      teamSettings.admins.find(a => a.name === this.user.name) &&
      teamSettings.name.toLowerCase() === this.$route.query.team.toLowerCase()) {
      console.log('in de IF!')
      teamSettings.symKey = crypto.toUint8Array(teamSettings.symKey)
      this.previousTeamSettings({
        settings: teamSettings,
        list: JSON.parse(window.localStorage.getItem('teammembers'))
      })
      this.$router.push({ name: 'team', params: { teamname: teamSettings.name } })
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
