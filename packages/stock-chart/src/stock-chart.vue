<template>
  <div ref="container" style="width:100%;height:100%">
    <canvas ref="canvas" :id="id" @contextmenu="handleContextMenu" :pixelRadio="pixelRadio" :width="chartWidth" :height="chartHeight" :style="{width: width+'px', height: height + 'px'}"></canvas>
  </div>
</template>
<script>
import Canvas from './charts/Canvas'
import MinChart from './charts/MinChart'
import MultiMinChart from './charts/MultiMinChart'
import KlineChart from './charts/KlineChart'
import KlineChart2 from './charts/KlineChart2'
import DataProvider from './charts/DataProvider'
import Gesture from './utils/gesture'
import MouseEventAdapter from './utils/mouseEventAdapter'
import { getRect } from './utils/dom'
import { throttle, debounce } from './utils/assist'

const SEED = [
  'a',
  'b',
  'c',
  'd',
  'e',
  'f',
  'g',
  'h',
  'i',
  'j',
  'k',
  'l',
  'm',
  'n',
  'o',
  'p',
  'q',
  'r',
  's',
  't',
  'u',
  'v',
  'w',
  'x',
  'y',
  'z',
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '0'
]

export default {
  name: 'mv-stockchart',
  data () {
    return {
      width: 375,
      height: 420,
      pixelRadio: 2,
      id: '',
      isNotExcuteActive: false // actived事件是否激活
    }
  },
  props: {
    // 股票代码
    obj: {
      type: String,
      required: true
    },
    // 图表类型：min(分时图)，1day(日K)，week(周K)，month(月K)
    chartType: {
      type: String,
      default: 'min',
      validator: function (value) {
        // 这个值必须匹配下列字符串中的一个
        return (
          [
            'min',
            'multi-min',
            'kline2',
            '1min',
            '5min',
            '15min',
            '30min',
            '60min',
            '1day',
            'week',
            'month',
            'season',
            'halfyear',
            'year'
          ].indexOf(value) !== -1
        )
      }
    },
    // 分时图开启简洁模式，只保留分时线和昨收线
    simplifiedMode: {
      type: Boolean,
      default: false
    },
    // k线的主指标
    klineMainIndics: {
      type: String,
      default: 'NONE'
      // validator: function (value) {
      //   // 这个值必须匹配下列字符串中的一个
      //   return ['NONE', 'MA', 'BOLL', 'DBJJ'].indexOf(value) !== -1
      // }
    },
    // k线的副图指标
    klineIndics: {
      type: String,
      default: 'NONE'
      // validator: function (value) {
      //   // 这个值必须匹配下列字符串中的一个
      //   return ['NONE', 'VOL', 'MACD', 'KDJ', 'RSI', 'DMA', 'BIAS', 'CCI', 'W&R'].indexOf(value) !== -1
      // }
    },
    // 多日分时：最大为10，值为5时表示取4天的历史分时加当天的分时
    days: {
      type: Number
    },
    // 价格 小数位数
    pricePrecision: {
      type: Number,
      default: 2
    },
    // 数量(量图) 小数位数
    volPrecision: {
      type: Number,
      default: 0
    },
    // 当一个元素被按住超过 longTapTime 毫秒触发长按事件
    longTapTime: {
      type: Number,
      default: 750
    },
    // 汇率
    huilv: {
      type: Number,
      default: 1
    },
    // 是否有均价
    hasAvgPrice: {
      type: Boolean,
      default: true
    },
    // 分时图时间段间隔，默认一小时(并且相邻时间段之间的距离不能小于100px)
    customInterval: {
      type: Number,
      default: 60
    },
    // 连续两次点击之间的间隔相差x毫秒，则触发双击事件，默认0，即不触发双击事件
    doubleTapTime: {
      type: Number,
      default: 0
    },
    upColor: {
      type: String,
      default: '#ee2c2c'
    },
    downColor: {
      type: String,
      default: '#1ca049'
    },
    // 按压时辅助线的颜色
    pointerLineColor: {
      type: String,
      default: '#3e6ac5'
    },
    // 按压时辅助线下方标签的颜色
    pointerTickColor: {
      type: String,
      default: '#ffffff'
    },
    // 坐标轴颜色
    gridLineColor: {
      type: String,
      default: '#d6d6d6'
    },
    // 坐标轴 文字颜色
    tickColor: {
      type: String,
      default: '#333333'
    },
    tickBackgroundColor: {
      type: String,
      default: '#ffffff'
    },
    // 分时图 价格线的颜色
    minLineColor: {
      type: String,
      default: '#3378dd'
    },
    // 分时图闭合区域填充色
    minFillColor: {
      type: [String, Object],
      // default: 'rgba(0, 149, 217, 0.2)'
      default: 'rgba(164, 202, 255, 0.2)'
    },
    // 均线的颜色
    avgPriceColor: {
      type: String,
      default: '#ff8800'
    },
    // ma线的颜色,一个数组，默认 MA5, MA10, MA30, MA60
    maColor: {
      type: Array,
      default: function () {
        return ['#e78512', '#2e8ae6', '#cc2996', '#3e6ac5', '#4ca92a', '#d3141a']
      }
    },
    // BOLL线的颜色,一个数组
    bollColor: {
      type: Array,
      default: function () {
        return ['#e78512', '#2e8ae6', '#cc2996']
      }
    },
    // MACD，DIFF和DEA 线的颜色
    macdColor: {
      type: Array,
      default: function () {
        return ['#e78512', '#2e8ae6']
      }
    },
    // KDJ线的颜色
    kdjColor: {
      type: Array,
      default: function () {
        return ['#e78512', '#2e8ae6', '#cc2996']
      }
    },
    // RSI线的颜色
    rsiColor: {
      type: Array,
      default: function () {
        return ['#e78512', '#2e8ae6', '#cc2996']
      }
    },
    // DMA指标的颜色
    dmaColor: {
      type: Array,
      default: function () {
        return ['#e78512', '#2e8ae6']
      }
    },
    // BIAS指标的颜色
    biasColor: {
      type: Array,
      default: function () {
        return ['#e78512', '#2e8ae6', '#cc2996']
      }
    },
    // CCI指标的颜色
    cciColor: {
      type: Array,
      default: function () {
        return ['#e78512']
      }
    },
    w8rColor: { // W&R,注：因为&是逻辑运算符，所以在组件定义的参数中用 w8r 代替，否则会报错；在作为值进行传入时仍然写成 'W&R'
      type: Array,
      default: function () {
        return ['#e78512', '#2e8ae6']
      }
    },
    // 主图DBJJ标签的颜色
    dbjjColor: {
      type: Array,
      default: function () {
        return ['#FF0F0F', '#EEEEEE', '#FF0F0F'] // 附图线条颜色,主图文字颜色，主图文字背景色
      }
    },
    qszzColor: {
      type: Array,
      default: function () {
        return ['#E61919', '#1CA249', '#1CA249', '#E61919', '#FF0000', '#1A75F1'] // 附图线条颜色,主图文字颜色，主图文字背景色
      }
    },
    // 是否显示趋势追踪的BS点
    qszzBSTag: {
      type: Boolean,
      default: false
    },
    // 成交量的交易单位，例如 100股为1手 ChengJiaoLiang要除以 100
    volTradeUnit: {
      type: Number,
      default: 100
    },
    // K线的除权标记，0(不复权),1(前复权),2(后复权)
    split: {
      type: Number,
      default: 1
    },
    // MA指标显示的数量控制
    maCount: {
      type: Number,
      default: 4
    },
    // 是否是手机端，手机端用触摸事件，pc端用鼠标事件
    isMobileMode: {
      type: Boolean,
      default: true
    },
    // 是否支持鼠标或触摸事件
    useEvent: {
      type: Boolean,
      default: true
    },
    // 分时图是否显示集合竞价阶段
    showPrefix: {
      type: Boolean,
      default: true
    },
    // 水平线数量（分时图中必须是偶数）
    horizLineCount: {
      type: Number,
      default: 4
    },
    leftRangeWidth: {
      type: Number,
      default: 0
    },
    rightRangeWidth: {
      type: Number,
      default: 0
    },
    // 绘图区域字体大小
    fontSize: {
      type: Number,
      default: 12
    },
    // 绘图区域字体
    fontFamily: {
      type: String,
      default: 'Arial'
    },
    initKlineCount: {
      type: Number,
      default: 80
    },

    // 扩展绘图
    chartExtend: {
      type: Array,
      default: null
    }
  },
  created () {
    this.klineChart = {}
    const str = this.randomStr(6)
    this.id = `canvas_${str}`
    // 函数防抖：把多个顺序地调用合并成一次，也就是在一定时间内，规定事件被触发的次数
    this.debounceShowChart = debounce(this.showChart, 15)
  },
  mounted () {
    this.isNotExcuteActive = true // 首次加载可以跳过actived事件，使用者主动调用一次loadchart();

    this.resizeFunc = throttle(this.resizeHandle, 200, 1000)
    window.addEventListener('resize', this.resizeFunc)
    let rect = getRect(this.$refs.container)
    this.width = rect.width
    this.height = rect.height
    this.pixelRadio = window.devicePixelRatio ? window.devicePixelRatio : 2

    if (this.$refs.canvas) {
      if (this.useEvent) {
        if (this.isMobileMode) {
          this.gesture = new Gesture(this.$refs.canvas, {
            longTapTime: this.longTapTime
          })
        } else {
          this.gesture = new MouseEventAdapter(this.$refs.canvas, {
            longTapTime: this.longTapTime
          })
        }

        this.gesture.on('move', this.onMove.bind(this))
        this.gesture.on('longTap', this.onLongTap.bind(this))
        this.gesture.on('pinch', this.onPinch.bind(this))
        this.gesture.on('end', this.onEnd.bind(this))
        this.gesture.on('tap', this.onTap.bind(this))
      }
    } else {
      console.warn('canvas未加载')
    }
  },
  activated () {
    // 根据状态判断是否需要执行activated事件
    if (this.isNotExcuteActive) {
      this.isNotExcuteActive = false
      return
    }
    this.loadChart()
  },

  deactivated () {
    this.init()
  },

  destroyed () {
    // 取消大小变化的监控
    window.clearTimeout(this.delayTimeOut)
    window.removeEventListener('resize', this.resizeFunc)
    this.resizeFunc = null

    this.init()
    if (this.gesture) {
      this.gesture.destroy()
    }
  },
  computed: {
    chartWidth () {
      return this.width * this.pixelRadio
    },
    chartHeight () {
      return this.height * this.pixelRadio
    }
  },
  watch: {
    obj (newValue, oldValue) {
      if (newValue !== oldValue) {
        this.isNotExcuteActive = true // obj变化可以跳过activated事件，避免多次loadchart();
        this.init()
        this.loadChart()
      }
    },
    width (newValue, oldValue) {
      if (newValue !== oldValue) {
        if (this.canvas) {
          this.canvas.width = newValue
        }
        this.debounceShowChart()
      }
    },
    height (newValue, oldValue) {
      if (newValue !== oldValue) {
        if (this.canvas) {
          this.canvas.height = newValue
        }
        this.debounceShowChart()
      }
    },
    chartType (newValue, oldValue) {
      if (newValue !== oldValue) {
        if (this.gesture) {
          this.gesture.handleTouchEnd()
        }
        this.debounceShowChart()
      }
    },
    pricePrecision (newValue, oldValue) {
      if (newValue !== oldValue) {
        this.debounceShowChart()
      }
    },
    volPrecision (newValue, oldValue) {
      if (newValue !== oldValue) {
        this.debounceShowChart()
      }
    },
    huilv (newValue, oldValue) {
      if (newValue !== oldValue) {
        if (this.chartDataProvider) {
          this.chartDataProvider.huilv = newValue
        }
        this.debounceShowChart()
      }
    },
    showPrefix (newValue, oldValue) {
      if (newValue !== oldValue) {
        if (this.chartDataProvider) {
          this.chartDataProvider.showPrefix = newValue
        }
        this.debounceShowChart()
      }
    },
    volTradeUnit (newValue, oldValue) {
      if (newValue !== oldValue) {
        if (this.chartDataProvider) {
          this.chartDataProvider.volTradeUnit = newValue
        }
        this.debounceShowChart()
      }
    },
    split (newValue, oldValue) {
      if (newValue !== oldValue) {
        this.debounceShowChart()
      }
    },
    upColor (newValue, oldValue) {
      if (newValue !== oldValue) {
        this.debounceShowChart()
      }
    },
    downColor (newValue, oldValue) {
      if (newValue !== oldValue) {
        this.debounceShowChart()
      }
    },
    pointerLineColor (newValue, oldValue) {
      if (newValue !== oldValue) {
        this.debounceShowChart()
      }
    },
    pointerTickColor (newValue, oldValue) {
      if (newValue !== oldValue) {
        this.debounceShowChart()
      }
    },
    gridLineColor (newValue, oldValue) {
      if (newValue !== oldValue) {
        this.debounceShowChart()
      }
    },
    tickColor (newValue, oldValue) {
      if (newValue !== oldValue) {
        this.debounceShowChart()
      }
    },
    tickBackgroundColor (newValue, oldValue) {
      if (newValue !== oldValue) {
        this.debounceShowChart()
      }
    },
    avgPriceColor (newValue, oldValue) {
      if (newValue !== oldValue) {
        this.debounceShowChart()
      }
    },
    klineIndics (newValue, oldValue) {
      if (newValue !== oldValue) {
        this.debounceShowChart()
      }
    },
    klineMainIndics (newValue, oldValue) {
      if (newValue !== oldValue) {
        this.debounceShowChart()
      }
    },
    chartExtend (newValue, oldValue) {
      if (newValue !== oldValue) {
        this.debounceShowChart()
      }
    }
  },
  methods: {
    /**
     * obj变化或者组件销毁时清空变量(缓存)
     */
    init () {
      this.chartDataProvider && this.chartDataProvider.cancel()
      this.chartDataProvider = null
      this.canvas = null
      if (this.minChart) {
        this.minChart = null
      }
      if (this.multiMinChart) {
        this.multiMinChart = null
      }
      if (this.kline2) {
        this.kline2 = null
      }
      this.klineChart = {}
    },
    updateSize () {
      let rect = getRect(this.$refs.container)
      if (rect.height !== this.height || rect.width !== this.width) {
        this.width = rect.width
        this.height = rect.height
      }
    },
    resizeHandle () {
      this.cleanTimer()
      this.delayTimeOut = window.setTimeout(() => {
        this.updateSize()
      }, 30)
    },
    cleanTimer () {
      if (this.delayTimeOut) {
        window.clearTimeout(this.delayTimeOut)
        this.delayTimeOut = null
      }
    },
    /**
     * 使用此组件(stock-chart)时，必须在组件mounted时调用此方法
     */
    loadChart () {
      this.chartDataProvider = new DataProvider(
        { obj: this.obj },
        this.$dzhyun,
        this.huilv,
        this.volTradeUnit,
        this.showPrefix
      )
      this.canvas = new Canvas({
        pixelRadio: this.pixelRadio,
        canvasId: this.id,
        width: this.width,
        height: this.height
      })
      this.debounceShowChart()
    },
    showChart () {
      let currentChart
      if (this.chartType === 'min') {
        if (!this.minChart) {
          this.minChart = new MinChart(this.chartDataProvider, {
            simplifiedMode: this.simplifiedMode,
            fontSize: this.fontSize,
            fontFamily: this.fontFamily,
            hasAvgPrice: this.hasAvgPrice,
            pricePrecision: this.pricePrecision,
            volPrecision: this.volPrecision,
            customInterval: this.customInterval,
            longTap: this.handleLongTap.bind(this),
            downColor: this.downColor,
            upColor: this.upColor,
            pointerLineColor: this.pointerLineColor,
            pointerTickColor: this.pointerTickColor,
            gridLineColor: this.gridLineColor,
            tickColor: this.tickColor,
            tickBackgroundColor: this.tickBackgroundColor,
            avgPriceColor: this.avgPriceColor,
            minLineColor: this.minLineColor,
            minFillColor: this.minFillColor,
            horizLineCount: this.horizLineCount,
            currentIndics: this.klineIndics,
            leftRangeWidth: this.leftRangeWidth,
            rightRangeWidth: this.rightRangeWidth,
            chartExtend: this.chartExtend
          })
        }
        currentChart = this.minChart
        currentChart.hasAvgPrice = this.hasAvgPrice
        currentChart.avgPriceColor = this.avgPriceColor
        currentChart.minLineColor = this.minLineColor
        currentChart.minFillColor = this.minFillColor
      } else if (this.chartType === 'multi-min') {
        if (!this.multiMinChart) {
          this.multiMinChart = new MultiMinChart(this.chartDataProvider, {
            days: this.days,
            fontSize: this.fontSize,
            fontFamily: this.fontFamily,
            hasAvgPrice: this.hasAvgPrice,
            pricePrecision: this.pricePrecision,
            volPrecision: this.volPrecision,
            customInterval: this.customInterval,
            longTap: this.handleLongTap.bind(this),
            downColor: this.downColor,
            upColor: this.upColor,
            pointerLineColor: this.pointerLineColor,
            pointerTickColor: this.pointerTickColor,
            gridLineColor: this.gridLineColor,
            tickColor: this.tickColor,
            tickBackgroundColor: this.tickBackgroundColor,
            avgPriceColor: this.avgPriceColor,
            minLineColor: this.minLineColor,
            minFillColor: this.minFillColor,
            horizLineCount: this.horizLineCount,
            currentIndics: this.klineIndics,
            leftRangeWidth: this.leftRangeWidth,
            rightRangeWidth: this.rightRangeWidth
          })
        }
        currentChart = this.multiMinChart
        currentChart.hasAvgPrice = this.hasAvgPrice
        currentChart.avgPriceColor = this.avgPriceColor
        currentChart.minLineColor = this.minLineColor
        currentChart.minFillColor = this.minFillColor
      } else if (this.chartType === 'kline2') {
        let needNew = false
        if (this.kline2) {
          if (this.kline2.split !== this.split) {
            needNew = true
          }
        } else {
          needNew = true
        }
        if (needNew) {
          this.kline2 = new KlineChart2(this.chartDataProvider, {
            period: '1min',
            pricePrecision: this.pricePrecision,
            volPrecision: this.volPrecision,
            longTap: this.handleLongTap.bind(this),
            downColor: this.downColor,
            upColor: this.upColor,
            pointerLineColor: this.pointerLineColor,
            pointerTickColor: this.pointerTickColor,
            gridLineColor: this.gridLineColor,
            tickColor: this.tickColor,
            tickBackgroundColor: this.tickBackgroundColor,
            minLineColor: this.minLineColor,
            minFillColor: this.minFillColor,
            split: this.split,
            horizLineCount: this.horizLineCount,
            currentIndics: 'VOL',
            leftRangeWidth: this.leftRangeWidth,
            rightRangeWidth: this.rightRangeWidth
          })
        }
        currentChart = this.kline2
        currentChart.minLineColor = this.minLineColor
        currentChart.minFillColor = this.minFillColor
      } else {
        const klineChartName = `klineChart${this.chartType}`
        let needNew = false
        if (this.klineChart[klineChartName]) {
          if (this.klineChart[klineChartName].split !== this.split) {
            needNew = true
          }
          if (this.klineChart[klineChartName].currentIndics !== this.klineIndics) {
            // 初始化指标数据
            this.klineChart[klineChartName].currentIndics = this.klineIndics
            this.klineChart[klineChartName].initIndicator(this.klineIndics)
          }
          if (this.klineChart[klineChartName].mIndics !== this.klineMainIndics) {
            // 初始化 主图 指标数据
            this.klineChart[klineChartName].mIndics = this.klineMainIndics
            this.klineChart[klineChartName].initIndicator(this.klineMainIndics)
          }
        } else {
          needNew = true
        }
        if (needNew) {
          this.klineChart[klineChartName] = new KlineChart(
            this.chartDataProvider,
            {
              period: this.chartType,
              maxCount: 240,
              minCount: 20,
              fontSize: this.fontSize,
              fontFamily: this.fontFamily,
              pricePrecision: this.pricePrecision,
              volPrecision: this.volPrecision,
              longTap: this.handleLongTap.bind(this),
              downColor: this.downColor,
              upColor: this.upColor,
              pointerLineColor: this.pointerLineColor,
              pointerTickColor: this.pointerTickColor,
              gridLineColor: this.gridLineColor,
              tickColor: this.tickColor,
              tickBackgroundColor: this.tickBackgroundColor,
              maColor: this.maColor,
              macdColor: this.macdColor,
              kdjColor: this.kdjColor,
              rsiColor: this.rsiColor,
              dmaColor: this.dmaColor,
              bollColor: this.bollColor,
              biasColor: this.biasColor,
              cciColor: this.cciColor,
              w8rColor: this.w8rColor,
              dbjjColor: this.dbjjColor,
              qszzColor: this.qszzColor,
              qszzBSTag: this.qszzBSTag,
              maCount: this.maCount,
              split: this.split,
              horizLineCount: this.horizLineCount,
              mIndics: this.klineMainIndics,
              currentIndics: this.klineIndics,
              leftRangeWidth: this.leftRangeWidth,
              rightRangeWidth: this.rightRangeWidth,
              chartExtend: this.chartExtend,
              initCount: this.initKlineCount
            }
          )
        }
        currentChart = this.klineChart[klineChartName]
        currentChart.maColor = this.maColor
        currentChart.macdColor = this.macdColor
        currentChart.kdjColor = this.kdjColor
        currentChart.rsiColor = this.rsiColor
        currentChart.dmaColor = this.dmaColor
        currentChart.bollColor = this.bollColor
        currentChart.biasColor = this.biasColor
        currentChart.cciColor = this.cciColor
        currentChart.w8rColor = this.w8rColor
        currentChart.dbjjColor = this.dbjjColor
        currentChart.qszzColor = this.qszzColor
        currentChart.qszzBSTag = this.qszzBSTag
      }
      currentChart.volPrecision = this.volPrecision
      currentChart.pricePrecision = this.pricePrecision
      /* 公共颜色重置  start */
      currentChart.upColor = this.upColor
      currentChart.downColor = this.downColor
      currentChart.pointerLineColor = this.pointerLineColor
      currentChart.pointerTickColor = this.pointerTickColor
      currentChart.gridLineColor = this.gridLineColor
      currentChart.tickColor = this.tickColor
      currentChart.tickBackgroundColor = this.tickBackgroundColor
      /* 扩展标记 */
      currentChart.chartExtend = this.chartExtend
      /* 公共颜色重置  end */
      if (this.canvas) {
        // debugger
        this.canvas.show(currentChart)
      }

      this.$emit('chart-showed')
    },
    /**
     * 移动端浏览器，长按的时候回显示一个菜单(提供一些复制 等功能)，类似于pc浏览器的右键菜单
     * 绘图的区域，即canvas要屏蔽contextmenu
     */
    handleContextMenu (e) {
      e.preventDefault()
    },
    onMove (e, params) {
      this.canvas.touchmove(e, params.deltaX)
    },
    onEnd (e) {
      this.$emit('touchend')
      if (this.canvas) {
        this.canvas.touchend()
      }
    },
    onTap (e) {
      this.$emit('tap')
    },
    onLongTap (e) {
      if (this.canvas) {
        this.canvas.longtap(e)
      }
    },
    onPinch (e, params) {
      this.canvas.pinch(e, params.zoom)
    },
    handleLongTap (data, type) {
      this.$emit('long-tap-select', data, type)
    },
    // 根据长度size生成随机字符串
    randomStr (size) {
      let seedlength = SEED.length
      let str = ''
      for (let i = 0; i < size; i++) {
        let j = Math.floor(Math.random() * seedlength)
        str += SEED[j]
      }
      return str
    },
    getLastIndicatorData () {
      const klineChartName = `klineChart${this.chartType}`
      let kline = this.klineChart[klineChartName]

      if (!kline) return null // K线图未生成的时候，返回null

      return kline.getLastIndicatorData()
    }
  }
}
</script>
