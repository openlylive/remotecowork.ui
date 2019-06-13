import { mapGetters } from 'vuex'

export default {
  name: 'callback',
  components: {},
  props: [],
  data () {
    return {

    }
  },
  computed: {
    ...mapGetters([
    ])
  },
  mounted () {
    console.log(this.$route.query)
    window.opener.postMessage({ data: this.$route.query, type: '3botlogin-finished' })
    window.close()
  },
  methods: {
  }
}
