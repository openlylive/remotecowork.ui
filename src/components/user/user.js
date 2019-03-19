import { mapActions } from 'vuex'

export default {
  name: 'user',
  components: {},
  props: [
    'user',
    'isAdmin',
    'itsme'
  ],
  data () {
    return {

    }
  },
  computed: {

  },
  mounted () {

  },
  methods: {
    ...mapActions([
      'makeAdmin'
    ])
  }
}
