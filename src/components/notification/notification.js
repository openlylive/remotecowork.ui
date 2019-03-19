import { mapGetters } from 'vuex'

export default {
  name: 'notification',
  computed: {
    ...mapGetters([
      'notifier'
    ])
  },
  methods: {
    showNotification () {
      this.$notification.show(this.notifier.title, {
        body: this.notifier.body,
        icon: '/img/icons/favicon-32x32.png'
      }, {})
    }
  },
  watch: {
    notifier (val) {
      if (val) {
        this.showNotification()
      }
    }
  }
}
