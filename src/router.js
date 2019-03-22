import Vue from 'vue'
import Router from 'vue-router'

Vue.use(Router)

export default new Router({
  mode: 'history',
  base: process.env.BASE_URL,
  routes: [
    {
      path: '/join',
      name: 'join',
      component: () => import(/* webpackChunkName: "teams" */ './views/Join'),
      meta: {
        requiresAuth: true,
        redirectable: false
      }
    },
    {
      path: '/location',
      name: 'location',
      component: () => import(/* webpackChunkName: "teams" */ './views/Location'),
      meta: {
        redirectable: false
      }
    },
    {
      path: '/login',
      name: 'login',
      component: () => import(/* webpackChunkName: "teams" */ './views/Login'),
      meta: {
        redirectable: false
      }
    },
    {
      path: '/',
      name: 'teams',
      component: () => import(/* webpackChunkName: "teams" */ './views/Teams'),
      meta: {
        requiresAuth: true,
        redirectable: true
      }
    },
    {
      path: '/teams/:teamname',
      name: 'team',
      component: () => import(/* webpackChunkName: "team" */ './views/Team'),
      meta: {
        requiresAuth: true,
        redirectable: true
      }
    },
    {
      path: '/error',
      name: 'errorpage',
      component: () => import(/* webpackChunkName: "teams" */ './views/errorpage'),
      meta: {
        redirectable: false
      }
    }
  ]
})
