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
    if (to.name !== 'teams') {
      next({
        name: 'location',
        query: {
          redirect: to.fullPath,
          threebotname: to.query.threebotname
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
