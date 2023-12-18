import StockChart from './src/stock-chart.vue'

// 为组件提供 install 安装方法，供按需引入
StockChart.install = function (Vue) {
  Vue.component(StockChart.name, StockChart)
}
export default StockChart
