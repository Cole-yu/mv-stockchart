import Vue from 'vue'
import Router from 'vue-router'
import Detail from './views/Detail'
import Min from './views/MinChart'
import Simple from './views/Simple'
import Kline from './views/KlineChart'

Vue.use(Router)

export default new Router({
  routes: [
    {
      path: '/',
      name: 'home',
      component: Detail
    },
    {
      path: '/min',
      name: 'min',
      component: Min
    },
    {
      path: '/kline',
      name: 'kline',
      component: Kline
    },
    {
      path: '/simple',
      name: 'Simple',
      component: Simple
    }
  ]
})
