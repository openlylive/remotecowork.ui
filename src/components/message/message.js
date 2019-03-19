import marked from 'marked'
import Prism from 'prismjs'
import VueMarkdown from 'vue-markdown'

import 'prismjs/themes/prism.css'

export default {
  name: 'message',
  components: {
    VueMarkdown
  },
  props: [
    'message',
    'mine'
  ],
  data () {
    return {
    }
  },
  computed: {
    signed () {
      return this.message.body.signature === 'verified'
    },
    forged () {
      return this.message.body.signature === 'forged'
    },
    messageClass () {
      var classes = 'primary white--text py-1 px-2 roundBorder'
      if (this.mine) classes += ' ml-3 accent'
      else classes += ' mr-3'
      return classes
    },
    body () {
      return marked(this.message.body)
    }
  },
  mounted () {
  },
  methods: {
    rendered (txt) {
      this.highlight()
    },
    highlight () {
      Prism.highlightAll()
    }
  }
}
