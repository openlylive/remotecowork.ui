import Vue from 'vue'

registerComponent('toolbar')
registerComponent('snackbar')
registerComponent('message')
registerComponent('promt')
registerComponent('user')
registerComponent('camstream')
registerComponent('notification')

function registerComponent (name) {
  Vue.component(name, () => import(`./${name}`))
}
