import copy from 'copy-to-clipboard'
import { mapActions, mapGetters } from 'vuex'
export default {
  name: 'teams',
  components: {},
  props: [],
  data () {
    return {
      valid: true,
      teamname: '',
      nameRegex: new RegExp(/^(\w+)$/),
      teamNameRules: [
        v => !!v || 'Teamname is required',
        v => this.nameRegex.test(v) || 'Teamname must contain between 3 and 50 non-special-characters'
      ]
    }
  },
  computed: {
    ...mapGetters([
      'user',
      'teamNameCheckStatus'
    ]),
    link () {
      if (this.teamname && this.valid) {
        var base = `${window.location.protocol}//${window.location.host}`
        if (!base.endsWith('/')) base += '/'
        return `${base}teams/${this.teamname.toLowerCase()}`
      }
    },
    teamNameValidIcon () {
      if (this.valid && this.teamNameCheckStatus.checked) {
        return this.teamNameCheckStatus.valid ? 'fas fa-check' : 'fas fa-times'
      }
    }
  },
  mounted () {
  },
  methods: {
    ...mapActions([
      'setSnackbarMessage',
      'createTeam',
      'checkUserName',
      'getBestLocation',
      'checkTeamName'
    ]),
    copyUrl () {
      if (this.link && this.valid) {
        copy(this.link)
        this.setSnackbarMessage(`Url copied to clipboard`)
      } else {
        if (!this.$refs.form.validate()) {
          this.setSnackbarMessage(`Oops, there are some errors here`)
        }
      }
    },
    join (e) {
      e.preventDefault()
      if (this.$refs.form.validate()) {
        this.createTeam(this.teamname)
        this.$router.push({
          name: 'team',
          params: {
            teamname: this.teamname.toLowerCase()
          }
        })
      } else {
        this.setSnackbarMessage(`Oops, there are some errors here`)
      }
    }
  }
}
