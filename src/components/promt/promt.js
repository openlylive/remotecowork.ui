import { mapGetters } from 'vuex'

export default {
  name: 'promt',
  components: {},
  props: [],
  data () {
    return {
      askData: false
    }
  },
  computed: {
    ...mapGetters([
      'promptMessages',
      'acceptedWait'
    ]),
    promptMessage () {
      return this.promptMessages[0]
    }
  },
  mounted () {

  },
  methods: {
    executeCancelAction () {
      this.$store.dispatch(this.promptMessage.cancelAction, this.promptMessage.payload)
    },
    executeOkAction () {
      this.$store.dispatch(this.promptMessage.okAction, this.promptMessage.payload)
    }
  },
  watch: {
    promptMessages (val) {
      if (val && val.length) this.askData = true
      else this.askData = !!this.promptMessages.length
    }
  }
}
