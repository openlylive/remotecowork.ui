import { mapGetters } from 'vuex'

export default {
  name: 'snackbar',
  components: {},
  props: [],
  data () {
    return {
      showSnackbar: false
    }
  },
  computed: {
    ...mapGetters([
      'snackbarMessage'
    ])
  },
  mounted () {

  },
  methods: {

  },
  watch: {
    snackbarMessage: function (val) {
      if (val) this.showSnackbar = true
      if (val.extra) console.error(`EXTRA MESSAGE`, val.extra)
    }
  }
}
