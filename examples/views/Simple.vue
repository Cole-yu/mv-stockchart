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
        :simplifiedMode='true'
        :showPrefix="false"
        :hasAvgPrice="false"
        :huilv="1"
        klineIndics='NONE'
        :pricePrecision="2"
        :customInterval="60"
        downColor="rgb(28,162,73)"
        upColor="rgb(230,25,25)"
        pointerLineColor="#144cb7"
        tickBackgroundColor="#999"
        minLineColor='#ff0000'
        :minFillColor='minFillColorObj'
        :horizLineCount='1'
        :leftRangeWidth="0"
        :rightRangeWidth="0"
        :isMobileMode="true"
        @long-tap-select="onChartSelect"
        @touchend="ontouchend"
      ></mv-stockchart>
    </div>
  </div>
</template>
<script>

// 开启简单模式需要修改的参数
// :simplifiedMode='true'
// :horizLineCount='1'
// minLineColor='#ff0000'  // 配置线条颜色
// :minFillColor='minFillColorObj' // 配置背景渐变色
// minFillColorObj.layout[3] 需要根据当前业务的高度进行调试

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
      // 渐变色配置
      minFillColorObj: {
        'type': 'LinearGradient',
        'layout': [0, 0, 0, 500],
        'colors': [[0, 'rgba(251,176,176,0.7)'], [1, 'rgba(251,176,176,0)']]
      },
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
        this.obj = 'B$994514'
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
