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
      'currentTeam',
      'user'
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
    const teams = JSON.parse(window.localStorage.getItem('teamsettings'))
    console.log(teams)
    var joiningTeam
    if (teams !== null && this.$route.query.team in teams) { joiningTeam = teams[this.$route.query.team] }

    if (this.$route.query.team &&
      joiningTeam !== undefined &&
      joiningTeam && joiningTeam.settings.name &&
      joiningTeam.settings.admins && joiningTeam.settings.admins.length &&
      joiningTeam.settings.admins.find(a => a.name === this.user.name) &&
      joiningTeam.settings.name.toLowerCase() === this.$route.query.team.toLowerCase()) {
      // teamSettings.symKey = crypto.toUint8Array(teamSettings.symKey)
      // var list = JSON.parse(window.localStorage.getItem('teammembers'))
      // list.find(user => user.name === this.user.name).online = true
      // this.previousTeamSettings({
      //   settings: teamSettings,
      //   list: list
      // })
      console.log('wookeiwooo', teams)
      Object.keys(teams).forEach(team => {
        console.log(team)
        teams[team].settings.symKey = crypto.toUint8Array(teams[team].settings.symKey)
      })
      this.previousTeamSettings(teams)
      this.setCurrentTeam(joiningTeam)
      this.$router.push({ name: 'team', params: { teamname: joiningTeam.settings.name } })
    } else {
      // is not a admin
      if (this.$route.query.team) {
        this.sendPingAdmins(this.$route.query.team).then(() => {
          var requestInterval = setInterval(() => {
            console.log(`Admin replied: ${this.invitationStatus.adminRepliedToPing}`)
            if (this.invitationStatus.adminRepliedToPing) {
              console.log('wookie!')
              this.sendSymKeyRequest(this.$route.query.team)
              clearInterval(requestInterval)
            } else {
              this.sendPingAdmins(this.$route.query.team)
            }
          }, 100)
        })
      }
    }
  },
  methods: {
    ...mapActions([
      'setSnackbarMessage',
      'sendSymKeyRequest',
      'sendPingAdmins',
      'previousTeamSettings',
      'setCurrentTeam'
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
