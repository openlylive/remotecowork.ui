export default {
  name: 'camstream',
  components: {},
  props: {
    id: String,
    muted: Boolean,
    fullheight: Boolean,
    streamname: ''
  },
  data () {
    return {
      ready: false
    }
  },
  computed: {

  },
  mounted () {

  },
  watch: {
    streamname: function (val) {
      if (val) {
        this.ready = false
      }
    }
  }
}
