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
        chartType="1day"
        :huilv="1"
        :pricePrecision="2"
        :customInterval="60"
        downColor="rgb(28,162,73)"
        upColor="rgb(230,25,25)"
        pointerLineColor="#144cb7"
        tickBackgroundColor="#144cb7"
        :qszzBSTag="true"
        :klineIndics="klineIndics"
        :klineMainIndics="klineMainIndics"
        :maCount="4"
        :isMobileMode="true"
        :initKlineCount="100"
        :useEvent ="true"
       :chartExtend='[{type: "label", style:{ line: "#FF8245", text: "#FF8245", background: "#FFEFE7"}, data: [{time:1575475200000,price:35.65,text:"买入"}]}]'
        @long-tap-select="onChartSelect"
        @touchend="ontouchend"
        @chart-showed="aftershow"
      ></mv-stockchart>
      <!-- :leftRangeWidth="50"
        :rightRangeWidth="0" -->
    </div>
    <div  style="height: 20vh; margin-top: -0.2rem;" >
    <span style="font-size: 16px; margin-left: 20px" @click="changMainIndics('MA')">MA</span>
    <span style="font-size: 16px; margin-left: 20px"  @click="changMainIndics('BOLL')">BOLL</span>
    <span style="font-size: 16px; margin-left: 20px" @click="changIndics('VOL')">VOL</span>
    <span style="font-size: 16px; margin-left: 20px" @click="changIndics('MACD')">MACD</span>
    <span style="font-size: 16px; margin-left: 20px" @click="changIndics('CCI')">CCI</span>
    <span style="font-size: 16px; margin-left: 20px" @click="changIndics('DBJJ')">DBJJ</span>
    <span style="font-size: 16px; margin-left: 20px" @click="changMainIndics('DBJJ')">DBJJ(主图)</span>
    <span style="font-size: 16px; margin-left: 20px" @click="changIndics('W&R')">W&R</span>
    <span style="font-size: 16px; margin-left: 20px" @click="changMainIndics('QSZZ')">QSZZ(主图)</span>
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
      detailData: null,
      klineIndics: 'DBJJ',
      klineMainIndics: 'QSZZ'
    }
  },
  methods: {
    init () {
      let query = this.$route.query
      if (query.hasOwnProperty('obj')) {
        this.obj = query.obj
      } else {
        this.obj = 'SH601519'
      }
    },
    changMainIndics (name) {
      this.klineMainIndics = name
    },
    changIndics (name) {
      this.klineIndics = name
    },

    onChartSelect (data, type) {
      this.detailType = type
      this.detailData = data
      // console.log('onChartSelect', data);
    },
    ontouchend () {
      let data = this.$refs.chart.getLastIndicatorData()
      console.log(data)

      this.detailType = ''
      this.detailData = null
    },
    aftershow () {
      // let data = this.$refs.chart.getLastIndicatorData()
      // console.log('aftershow', data)
      // if (!data) {
      //   let timer = setInterval(() => {
      //     let data = this.$refs.chart.getLastIndicatorData()
      //     console.log(123, data)
      //     if (data) clearInterval(timer)
      //   }, 300)
      // }

      setTimeout(() => {
        let data = this.$refs.chart.getLastIndicatorData()
        console.log('延后', data)
      }, 800)
    }
  }
}
</script>
