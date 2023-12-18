<template>
  <div
    ref="page"
    class="detail-page-wrap"
  >
    <div
      class="stock-chart-wrap bg-f"
    >
      <mv-stockchart
        ref="chart"
        :obj="obj"
        chartType="min"
        :showPrefix="false"
        :hasAvgPrice="false"
        :huilv="1"
        klineIndics='VOL'
        :pricePrecision="2"
        :customInterval="60"
        downColor="rgb(28,162,73)"
        upColor="rgb(230,25,25)"
        pointerLineColor="#144cb7"
        tickBackgroundColor="#999"
        :leftRangeWidth="80"
        :rightRangeWidth="60"
        :isMobileMode="true"
        :chartExtend='[{type: "label", style:{ line: "#FF8245", text: "#FF8245", background: "#FFEFE7"}, data: [{time:1575509520000,price:2885.39,text:"低吸"}]}]'
        @long-tap-select="onChartSelect"
        @touchend="ontouchend"
      ></mv-stockchart>
    </div>
  </div>
</template>
<script>

const hasOwnProperty = Object.hasOwnProperty
export default {
  created () {
    this.init()
  },
  mounted () {
    this.$refs.chart.loadChart()
  },
  data () {
    return {
      obj: '', // 股票代码
      stock: {},
      detailType: '',
      detailData: null
    }
  },
  methods: {
    init () {
      let query = this.$route.query
      if (query.hasOwnProperty('obj')) {
        this.obj = query.obj
      } else {
        this.obj = 'SH000001'
      }
    },
    onChartSelect (data, type) {
      this.detailType = type
      this.detailData = data
      // console.log('onChartSelect', data);
    },
    ontouchend () {
      this.detailType = ''
      this.detailData = null
    }
  }
}
</script>
