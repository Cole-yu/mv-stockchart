import Vue from 'vue'
import Dzhyun from 'dzhyun-vue-data'
import App from './App.vue'
import router from './router'

// import MvStockChart from '../packages/index'
import MvStockChart from '../lib/mv-stockchart.umd.min.js'

// 注册组件库
Vue.use(MvStockChart)

Vue.config.productionTip = false

Vue.use(Dzhyun, {
  address: 'ws://10.15.144.131/ws',
  dataType: 'json',
  compresser: 'snappy',
  token: '0000003c:1562034580:06fddb425a2c9998bb42a3b083d54ca04562601b'
})

new Vue({
  router,
  render: h => h(App)
}).$mount('#app')