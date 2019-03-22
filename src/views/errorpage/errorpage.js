import { mapGetters } from 'vuex'

export default {
  name: 'errorpage',
  components: {},
  props: [],
  data () {
    return {

    }
  },
  computed: {
    ...mapGetters([
      'fatalError'
    ])
  },
  mounted () {

  },
  methods: {
    relogin () {
      this.$router.push({ name: 'login' })
    }
  }
}
