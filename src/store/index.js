import Vue from 'vue'
import Vuex from 'vuex'

import plugins from './plugins'

import main from './mainStore'
import team from './teamStore'
import messages from './messageStore'
import signal from './signalStore'
import user from './userStore'
import video from './videoStore'

Vue.use(Vuex)
export default new Vuex.Store({
  plugins: [plugins(this)],
  modules: {
    main,
    user,
    team,
    messages,
    signal,
    video
  }
})

// Maybe ivan can show me where to put this 'clean'
function escapeHtml (str) {
  var div = document.createElement('template')
  div.appendChild(document.createTextNode(str))
  return div.innerHTML
}
window.escapeHtml = escapeHtml
