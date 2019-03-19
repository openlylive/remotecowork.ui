import Vue from 'vue'

export const autoscroll = {
  update: function (el) {
    Vue.nextTick().then(function () {
      el.scrollTop = el.scrollHeight
    })
  }
}
