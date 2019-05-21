import { mapActions, mapGetters } from 'vuex'
import cookie from 'js-cookie'
export default {
  name: 'location',
  components: {
  },
  props: [],
  data () {
    return {
      mobile: false,
      location: '',
      loadingLocation: false
    }
  },
  computed: {
    ...mapGetters([
      'locations',
      'localJanusLocation',
      'user',
      'teamSettings'
    ])
  },
  mounted () {
    if (!this.$route.query.threebotname) {
      if (this.isMobile() && !this.loginWith3bot) {
        this.mobile = true
      }
    }
    this.getAllLocations()
  },
  methods: {
    ...mapActions([
      'getBestLocation',
      'getAllLocations',
      'setLocalJanusLocation',
      'initWithKey'
    ]),
    openInApp () {
      window.location.href = `threebot://openmeetings/${this.teamSettings.name}`
    },
    isMobile () {
      if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
        return true
      } else {
        return false
      }
    },
    autoLocation () {
      this.loadingLocation = true
      this.getBestLocation().then(locationName => {
        this.location = locationName
        this.loadingLocation = false
      })
    },
    selectLocation (loc) {
      this.location = loc
      this.saveLocation()
    },
    saveLocation (e) {
      if (e) {
        e.preventDefault()
      }
      this.setLocalJanusLocation(this.location)

      var user = cookie.getJSON('user')
      if (user && user.name && user.privateKey) {
        var teamName = null
        if (this.$route.query && this.$route.query.redirect) {
          const redirectTo = this.$route.query.redirect
          teamName = redirectTo.substr(redirectTo.lastIndexOf('/') + 1, redirectTo.length)
        }
        this.initWithKey({
          name: user.name,
          key: user.privateKey,
          teamName: teamName
        })
      } else {
        this.$router.push({
          name: 'login',
          query: this.$route.query
        })
      }
    }
  },
  watch: {
    user: {
      handler: function (val) {
        if (val.name && val.privateKey) {
          if (this.$route.query.redirect) {
            const redirectTo = this.$route.query.redirect
            const teamName = redirectTo.substr(redirectTo.lastIndexOf('/') + 1, redirectTo.length)
            this.$router.push({ name: 'join', query: { team: teamName } })
          } else {
            this.$router.push({
              name: 'teams'
            })
          }
        } else {
          this.$router.push({
            name: 'login',
            query: this.$route.query
          })
        }
      },
      deep: true
    }
  }
}
