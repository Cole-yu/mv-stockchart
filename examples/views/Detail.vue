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
        :pricePrecision="2"
        :customInterval="60"
        downColor="rgb(28,162,73)"
        upColor="rgb(230,25,25)"
        pointerLineColor="#144cb7"
        :leftRangeWidth="70"
        :rightRangeWidth="50"
        klineIndics="NONE"
        klineMainIndics="NONE"
        :isMobileMode="false"
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
    this.subBaseInfo()
  },
  mounted () {
    this.$refs.chart.loadChart()
  },
  beforeDestroy () {
    if (this.subscribeBaseInfo) {
      this.subscribeBaseInfo.cancel()
    }
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
    subBaseInfo () {
      if (this.obj) {
        let params = {
          obj: this.obj,
          field:
            'ZhongWenJianCheng,ZuiXinJia,ZhangFu,ZhangDie,ChengJiaoLiang,KaiPanJia,ZuoShou,ZuiGaoJia,ZuiDiJia,XiaoShuWei',
          count: 1
        }
        this.subscribeBaseInfo = this.$dzhyun.subscribe(
          '/quote/stkdata',
          params,
          data => {
            // console.log('subBaseInfo', data);
            if (data && !(data instanceof Error)) {
              if (data[0]) {
                this.stock = data[0]
              }
            }
          }
        )
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
