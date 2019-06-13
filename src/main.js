import Vue from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'
import './plugins'
import './components'
import './directives'
import './style.scss'

Vue.config.productionTip = true

router.beforeEach((to, from, next) => {
  if (to.matched.some(record => record.meta.requiresAuth) && !store.getters.user.name) {
    console.log(to.fullPath)
    let pathToRedirect = to.fullPath
    if (pathToRedirect.includes('/join?team=')) {
      pathToRedirect = '/teams/' + pathToRedirect.split('=')[1]
    }
    if (to.name !== 'teams') {
      next({
        name: 'location',
        query: {
          redirect: pathToRedirect
        }
      })
    } else {
      next({
        name: 'location'
      })
    }
  } else {
    next()
  }
})

export default new Vue({
  router,
  store,
  render: h => h(App)
}).$mount('#app')
