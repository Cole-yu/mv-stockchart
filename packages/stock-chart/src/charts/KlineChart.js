import Chart from './Chart.js'
import stockUtils from '../utils/stockUtils'

export default class KlineChart extends Chart {
  initData () {
    super.initData()
    // 主图指标，NONE || MA || BOLL
    this.mIndics = this.options.mIndics
    // ma线的颜色
    this.maColor = this.options.maColor || ['#FFD11E', '#F77BFC', '#39C2FD', '#B7B7B7', '#D3141A', '#FF8802']
    // BOLL线的颜色
    this.bollColor = this.options.bollColor || ['#FFD11E', '#F77BFC', '#39C2FD']
    // MACD的 DIF DEA 线的颜色
    this.macdColor = this.options.macdColor || ['#FFD11E', '#F77BFC']
    // KDJ的颜色
    this.kdjColor = this.options.kdjColor || ['#FFD11E', '#F77BFC', '#39C2FD']
    // RSI的颜色
    this.rsiColor = this.options.rsiColor || ['#FFD11E', '#F77BFC', '#39C2FD']
    // DMA指标的颜色
    this.dmaColor = this.options.dmaColor || ['#FFD11E', '#F77BFC']
    // BIAS指标的颜色
    this.biasColor = this.options.biasColor || ['#FFD11E', '#F77BFC', '#39C2FD']
    // CCI指标的颜色
    this.cciColor = this.options.cciColor || ['#FFD11E']
    // W&R指标的颜色
    this.w8rColor = this.options.w8rColor || ['#FFD11E', '#F77BFC']
    // DBJJ指标的颜色
    this.dbjjColor = this.options.dbjjColor || ['#FF0F0F', '#EEEEEE', '#FF0F0F']
    // QSZZ指标的颜色
    this.qszzColor = this.options.qszzColor || ['#E61919', '#1CA249', '#1CA249', '#E61919', '#FF0000', '#1A75F1']
    // QSZZ BS标签
    this.qszzBSTag = this.options.qszzBSTag
    // MA指标显示的数量控制 dongw+
    this.maCount = this.options.maCount || 4
    // 初始化数据,取options中data字段作为初始数据
    this.data = this.options.data || [] // 界面上当前显示图的数据
    this.klineTimes = [] // 当前可视区域的时间缓存，毫秒为单位
    this.cache = [].concat(this.data) // 缓存好的数据

    this.indicsData = {} // 指标数据

    this.period = this.options.period || '1day'
    this.split = this.options.split !== undefined ? this.options.split : 1

    // 最大显示条数(理论数值,不能大于重画时计算出的最大条数)
    this.maxCount = this.options.maxCount || Number.MAX_VALUE

    // 最小显示条数
    this.minCount = this.options.minCount || 50

    // 最大预加载数据条数,默认300,预加载数据条数取当前显示条数和最大预加载数据条数中较小的一个值
    this.maxPreLoadCount = this.options.maxPreLoadCount || 300

    // 位置表示显示数据在缓存中开始位置
    this.position = 0

    this.hasMoreData = true
    this.defaultRequestCount = 0

    // 初始需要展示的数据条数,默认80
    this.reCalculate(0, this.options.initCount || 80)

    this.initSubscribe()
  }
  initSubscribe () {
    // 订阅K线数据变化(更新最新的1条数据)
    let param = {
      period: this.period,
      split: this.split,
      start: -1
    }
    this.dataProvider.subscribeKline(param,
      data => {
        if (data.length > 0) {
          const updateData = data[0]
          if (this.cache.length > 0) {
            // 订阅K线，每次收到的都是最新的一条数据，即cache缓存数据最后一条数据所对应日期的最新数据
            this.cache[this.cache.length - 1] = updateData
          }
          this.reCalculate()
        }
        if (this.currentIndics !== 'NONE' && this.currentIndics !== 'VOL') {
          this.getIndicatorData(this.currentIndics, param)
        }
        if (this.mIndics !== 'NONE') {
          // 获取主图指标数据
          this.getIndicatorData(this.mIndics, param)
        }
      }
    )
  }

  redraw () {
    if (this.data) {
      super.redraw()
    }
  }

  initChart () {
    super.initChart()

    // 根据画板宽度调整显示数据个数,1像素最多显示一条数据(单条数据小于1像素时,需要调整显示个数),间隙和影线宽度都是固定的1像素
    let count = this.data.length

    // FIXME count = 0
    let pixelPerWithSeparator = this.mainChartWidth / count
    let pixelPer = Math.max(pixelPerWithSeparator * 2 / 3, 0.5)
    if (pixelPerWithSeparator < 1) {
      // 如果数据量过多，导致每条数据不到1像素时
      pixelPerWithSeparator = 1
      // 显示数据量调整为画布宽度
      count = this.mainChartWidth
      this.data = this.data.slice(0, count)
      this.klineTimes = this.data.map(item => item.ShiJian * 1000)
      this.maxCount = count
    } else if (pixelPer > 50) {
      // 超过最大值50,则取最大值
      pixelPerWithSeparator = 90
      pixelPer = 60
    }
    // X轴每条数据最小单位像素(每根柱子所占宽度)
    this.pixelPer = pixelPer
    //  X轴最小单位像素(每根柱子所占宽度+柱子间的间隔)
    this.pixelPerWithSeparator = pixelPerWithSeparator

    // 计算最大和最小值
    const MAX_VALUE = Number.MAX_VALUE
    const MIN_VALUE = Number.MIN_VALUE
    let min = MAX_VALUE
    let max = 0
    let maxVolume = 0
    let maxIndics = 0
    let minIndics = 0
    let mainIndicsData // 主图指标数据 DBJJ只画标签，不参与计算
    if (this.mIndics !== 'NONE' && this.mIndics !== 'DBJJ') {
      mainIndicsData = this.indicsData[this.mIndics]
    }
    this.data.forEach(eachData => {
      max = Math.max(
        max,
        eachData.ZuiGaoJia || MIN_VALUE
      )
      min = Math.min(
        min,
        eachData.ZuiDiJia || MAX_VALUE
      )
      if (mainIndicsData && mainIndicsData[eachData.ShiJian]) {
        let arr = mainIndicsData[eachData.ShiJian]
        let index = 0
        let count = arr.length
        if (this.mIndics === 'QSZZ') {
          // 趋势追踪部分数据参与计算
          index = 4; count = 2
        }
        for (let i = index, j = index + count; i < j; i++) {
          max = Math.max(max, arr[i])
          min = Math.min(min, arr[i])
        }
      }
      if (this.currentIndics !== 'NONE') {
        if (this.currentIndics === 'VOL') {
          maxVolume = Math.max(maxVolume, eachData.ChengJiaoLiang)
        } else {
          let iData = this.indicsData[this.currentIndics]
          if (iData && iData[eachData.ShiJian]) {
            let arr = iData[eachData.ShiJian]
            let count = arr.length
            if (this.currentIndics === 'DBJJ') {
              count = 1
            }
            for (let i = 0, j = count; i < j; i++) {
              maxIndics = Math.max(maxIndics, arr[i])
              minIndics = Math.min(minIndics, arr[i])
            }
          }
        }
      }
    })
    // 最大值和最小值范围增加10%
    this.max = max > min ? max + (max - min) * 0.1 : max * 1.1
    this.min = max > min ? min - (max - min) * 0.1 : max * 0.9
    if (this.split === 0 && this.min < 0) {
      this.min = 0
    }
    this.maxVolume = maxVolume

    if (maxIndics >= 0) {
      this.maxIndics = Math.ceil(maxIndics * 110) / 100
    } else {
      this.maxIndics = Math.floor(maxIndics * 110) / 100
    }
    if (minIndics >= 0) {
      this.minIndics = Math.ceil(minIndics * 110) / 100
    } else {
      this.minIndics = Math.floor(minIndics * 110) / 100
    }

    this.candleChartHeight = this.mainChartHeight
    // K线图Y轴每单位像素
    this.candleYPixelRadio = this.candleChartHeight / (this.max - this.min)
    if (maxVolume > 0) {
      this.volumeYPixelRadio = this.volumeChartHeight / maxVolume
    }

    let off
    switch (this.currentIndics) {
      case 'VOL':
        this.indicsYPixelRadio = this.indicsChartHeight / maxVolume
        break
      case 'MACD':
        off = Math.max(Math.abs(this.maxIndics), Math.abs(this.minIndics))
        this.indicsYPixelRadio = this.indicsChartHeight / (off * 2)
        break
      case 'KDJ':
      case 'RSI':
      case 'DMA':
      case 'BIAS':
      case 'CCI':
      case 'W&R':
      case 'DBJJ':
        off = this.maxIndics - this.minIndics
        this.indicsYPixelRadio = this.indicsChartHeight / off
        break
      default:
        break
    }
  }

  /**
   * 重新计算显示数据在缓存数据中的左偏移位置和长度
   * @param {Number} move 移动了多少单位(移动了多少根k线)：move为正数表示向左移动,负数表示向右移动
   * @param {Number} count 要显示的数据条数
   */
  reCalculate (move = 0, count) {
    // 重新计算显示数据在缓存数据中的左偏移位置和长度
    const cacheCount = this.cache.length
    let requestCount = 0
    let currentCount = this.data.length
    let leftPosition = this.position

    // 如果move为正数,表示向左移动,判断缓存数据是否存在,缓存数据不足则加载更多数据,负数表示向右移动直接从缓存中取得数据
    if (move > 0) {
      // 手指向右划，数据向左移动
      if (leftPosition < move) {
        // 如果最左边数据的index小于移动的距离，说明缓存数据不够了
        if (this.hasMoreData) {
          requestCount = move - leftPosition
        } else {
          leftPosition = 0
        }
      } else {
        leftPosition -= move
      }
    } else if (move < 0) {
      // 手指向左划，数据向右移动
      const restCount = cacheCount - leftPosition - currentCount // 右侧还有多少未显示的剩余数据
      if (restCount > -move) {
        // 说明剩余数据比滑动的距离需要的数据多
        leftPosition += -move
      } else {
        leftPosition += restCount
      }
    }

    // count 重设显示数据个数(先重新计算左偏移,再重设count)
    // 限制最小个数
    if (count) {
      count = Math.max(count, this.minCount)
    }

    // 如果count比当前个数小,则直接左偏移向右移动count/2
    if (count < currentCount) {
      leftPosition += Number.parseInt((currentCount - count), 10)
      currentCount = count
    } else if (count > currentCount) {
      // 限制显示的最大个数
      count = Math.min(count, this.maxCount)
      // 计算新的显示个数比老的 多显示 多少
      let leftOffsetCount = Number.parseInt((count - currentCount), 10)

      // leftOffsetCount += Math.max(
      //   leftOffsetCount - (cacheCount - leftPosition - currentCount),
      //   0
      // );

      // 如果缓存数据不足则加载更多数据
      if (leftPosition < leftOffsetCount && this.hasMoreData) {
        requestCount = leftOffsetCount - leftPosition
      } else {
        leftPosition = Math.max(leftPosition - leftOffsetCount, 0)
        currentCount = count
      }
    }

    // requestCount不为零则加载数据后再做reCalculate
    if (requestCount > 0) {
      // 计算请求数据的start和count,count需要加上预加载个数(默认等于当前显示的数据个数,但不能超过限制的最大值)
      // 初始currentCount为0时,请求个数为初始显示个数的2倍
      requestCount += Math.min(
        currentCount || requestCount,
        this.maxPreLoadCount
      )
      const start = -(requestCount + cacheCount)

      this.defaultRequestCount = requestCount // 记录当前请求数量，用于指标请求时容错使用

      this.loadMoreData(start, requestCount).then(() => {
        this.reCalculate(move, count)
      })
      return
    }

    // 根据新的左偏移位置和新的数据个数重设显示数据data后重画图形
    this.data = this.cache.slice(leftPosition, leftPosition + currentCount)
    this.klineTimes = this.data.map(item => item.ShiJian * 1000)
    this.position = leftPosition
    this.redraw()
  }

  /**
   * 动态加载数据,添加到缓存cache中并且修改当前位置
   * @param {Number} start 行筛选，-1表示最后一行开始，7表示从第7行开始
   * @param {Number} count 行筛选，大于等于0的整数，表示从start的位置往后筛选多少行数据（包括start）
   */
  loadMoreData (start, count) {
    this.loading = true
    this.canvas && this.canvas.toggleMask(true)
    const lastDataProvider = this.dataProvider

    let param = {
      period: this.period,
      start,
      count,
      split: this.split
    }
    const klinePromise = this.dataProvider.getKline(param)
    if (this.currentIndics !== 'NONE' && this.currentIndics !== 'VOL') {
      this.getIndicatorData(this.currentIndics, param)
    }
    if (this.mIndics !== 'NONE') {
      // 获取主图指标数据
      this.getIndicatorData(this.mIndics, param)
    }
    return klinePromise.then(klineData => {
      if (klineData && lastDataProvider === this.dataProvider) {
        // // 合并数据到缓存中,判断是否还有更多数据(请求到的数据的时间在cache中已经存在)
        const cacheStartTime = this.cache[0]
          ? this.cache[0].ShiJian
          : Number.MAX_VALUE
        let eachData
        for (let i = klineData.length; i > 0; i -= 1) {
          eachData = klineData[i - 1]
          if (eachData.ShiJian < cacheStartTime) {
            this.cache.unshift(eachData)
            this.position += 1
          } else {
            this.hasMoreData = false
            // break;
          }
        }
      }
      this.loading = false
      this.redraw()
    })
  }

  initIndicator (indicName) {
    let count = this.cache.length || this.defaultRequestCount

    if (count > 0) {
      let param = {
        period: this.period,
        start: -count,
        count: count,
        split: this.split
      }
      this.getIndicatorData(indicName, param)
    }
  }

  getIndicatorData (indicName, param) {
    if (indicName === 'NONE') {
      return
    }
    let indicParam = {}
    // dongw- 使用MA的默认参数即可
    // if (indicName === 'MA') {
    //   indicParam = {
    //     name: 'MA',
    //     text: 'MA1:MA(CLOSE,P1);MA2:MA(CLOSE,P2);MA3:MA(CLOSE,P3);MA4:MA(CLOSE,P4);',
    //     parameter: 'P1=5,P2=10,P3=30,P4=60'
    //   }
    // } else {
    indicParam = {
      name: indicName
    }
    // }
    let params = Object.assign({}, param, indicParam)
    this.dataProvider.getIndicatorData(params).then(data => {
      // console.log(`指标(${indicName})的数据：`, JSON.parse(JSON.stringify(data)))
      if (data.length > 0) {
        let e
        for (let i = 0, j = data.length; i < j; i++) {
          e = data[i]
          if (!this.indicsData[indicName]) {
            this.indicsData[indicName] = {}
          }
          if (indicName === 'MA') {
            // 控制ma显示数量。2019-08-07 kuang+
            e.JieGuo = e.JieGuo.slice(0, this.maCount)
          }
          this.indicsData[indicName][e.ShiJian] = e.JieGuo
        }
        this.redraw()
      }
    })
  }

  /**
   * 格式化日期
   * @param {Number} text 日期，以毫秒为单位
   * @param {Boolean} hasDate 返回格式是否带年月日
   * @param {*} format 格式化参数，例：'yyyy-MM-dd'
   * @returns hasDate ? 'yyyy-MM-dd' : 'yyyy-MM'
   */
  formatXAxisLabel (text, hasDay = false, format = null) {
    const date = new Date(text)
    if (format) return stockUtils.formatDate(date, format)

    return hasDay
      ? stockUtils.formatDate(date, 'yyyy-MM-dd')
      : stockUtils.formatDate(date, 'yyyy-MM')
  }

  /* eslint class-methods-use-this: 0 */
  /**
   * 判断是否是上涨状态
   * @param {Number} open 开盘价
   * @param {Number} close 收盘价
   * @param {Number} lastClose 昨收
   */
  isUp (open, close, lastClose) {
    // FIXME 还需要考虑当天收盘和昨收相同的情况
    return open !== close ? close > open : close > lastClose
  }

  drawChart () {
    const pixelPerWithSeparator = this.pixelPerWithSeparator
    const pixelPer = this.pixelPer
    const halfPixelPer = pixelPer / 2
    const candleYPixelRadio = this.candleYPixelRadio
    const max = this.max
    const canvas = this.canvas
    let lastLabel
    let currentLabel
    let lastDrawIndex = -1
    // 是否是分钟k线
    let isMinKline = this.period.indexOf('min') > -1

    let timeFormatter = 'yyyy-MM-dd'
    let labelFormatter = 'yyyy-MM'
    if (isMinKline) {
      timeFormatter = 'MM-dd hh:mm'
      labelFormatter = 'MM-dd hh'
    }
    // 主图指标MA, BOLL
    let mainCommonLinePoints = []
    // 主图指标DBJJ
    let mainCommonTags = []
    // MACD线
    let macdPoints = []
    // 通用的 KDJ, RSI, DMA
    let commonLinePoints = []
    const baseHeight = this.canvas.canvasHeight - this.indicsChartHeight
    let firstPointIndex = -1 // 记录下来的第一个点的索引
    // 画出每根k线和量
    let ratio = 0.15
    if (isMinKline) {
      ratio = 0.4
    }
    this.data.forEach((eachData, index) => {
      let lastClose = eachData.lastClose

      // 添加数据附加属性
      if (!lastClose) {
        lastClose = eachData.lastClose =
          index > 0 ? this.data[index - 1].ShouPanJia : 0
        eachData.time = eachData.ShiJian * 1000
        eachData.isUp = this.isUp(
          eachData.KaiPanJia,
          eachData.ShouPanJia,
          lastClose
        )
        // xAxisLabel为年月yyyy-MM 分钟线格式为
        eachData.xAxisLabel = this.formatXAxisLabel(eachData.time, undefined, labelFormatter)
      }

      currentLabel = eachData.xAxisLabel

      // 满足条件画x轴坐标(跨月的第一交易日并且两个坐标点之间的距离不小于指定大小)
      if (currentLabel !== lastLabel) {
        lastLabel = currentLabel
        // if ((lastDrawIndex === -1 && index > 0) || (index - lastDrawIndex) * pixelPerWithSeparator > (64 * this.canvas.pixelRadio)) {
        //   this.drawXAxisGridLine(
        //     (pixelPerWithSeparator * index + halfPixelPer + this.leftRangeWidth),
        //     this.formatXAxisLabel(eachData.time, undefined, isMinKline ? 'hh:mm' : 'yyyy-MM'),
        //     undefined,
        //     undefined,
        //     undefined,
        //     undefined,
        //     undefined,
        //     false
        //   )
        //   lastDrawIndex = index
        // }

        // 第一个日期
        if (lastDrawIndex === -1 && index > 0) {
          this.drawXAxisGridLine(
            (pixelPerWithSeparator * index + halfPixelPer + this.leftRangeWidth),
            this.formatXAxisLabel(eachData.time, undefined, isMinKline ? 'hh:mm' : 'yyyy-MM'),
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            false
          )
          lastDrawIndex = index
          firstPointIndex = index
        }

        const SPACE_GAP = this.canvas.measureText(this.formatXAxisLabel(eachData.time, undefined, isMinKline ? 'hh:mm' : 'yyyy-MM'))

        // 第二个日期
        if (lastDrawIndex === firstPointIndex && ((index - lastDrawIndex) * pixelPerWithSeparator >= (SPACE_GAP * (1.5 + ratio))) && ((index * pixelPerWithSeparator) < this.mainChartWidth)) {
          this.drawXAxisGridLine(
            (pixelPerWithSeparator * index + halfPixelPer + this.leftRangeWidth),
            this.formatXAxisLabel(eachData.time, undefined, isMinKline ? 'hh:mm' : 'yyyy-MM'),
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            false
          )
          lastDrawIndex = index
        }
        if (lastDrawIndex !== firstPointIndex && ((index - lastDrawIndex) * pixelPerWithSeparator >= (SPACE_GAP * (1 + ratio))) && ((index * pixelPerWithSeparator) < (this.mainChartWidth - SPACE_GAP * 0.5))) { // 第三个到最后一个日期
          this.drawXAxisGridLine(
            (pixelPerWithSeparator * index + halfPixelPer + this.leftRangeWidth),
            this.formatXAxisLabel(eachData.time, undefined, isMinKline ? 'hh:mm' : 'yyyy-MM'),
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            false
          )
          lastDrawIndex = index
        }
      }

      this.drawCandle(
        index,
        eachData.KaiPanJia,
        eachData.ShouPanJia,
        eachData.ZuiGaoJia,
        eachData.ZuiDiJia,
        eachData.isUp
      )
      let x = pixelPerWithSeparator * index + halfPixelPer + this.leftRangeWidth
      if (index === 0) {
        x -= halfPixelPer
      } else if (index === this.data.length - 1) {
        x += halfPixelPer
      }
      let commonLineData
      switch (this.currentIndics) {
        case 'VOL':
          this.drawVolume(index, eachData.ChengJiaoLiang, eachData.isUp)
          break
        case 'MACD':
          let macdData = this.indicsData[this.currentIndics]
          if (macdData && macdData[eachData.ShiJian]) {
            // 有数据
            const maxIndicsOffset = Math.max(Math.abs(this.maxIndics), Math.abs(this.minIndics))
            this.calMACDPoints(macdData[eachData.ShiJian], macdPoints, x, baseHeight, maxIndicsOffset)
            this.drawMACDStick(index, macdData[eachData.ShiJian][2], baseHeight)
          }
          break
        case 'KDJ':
        case 'RSI':
        case 'DMA':
        case 'BIAS':
        case 'CCI':
        case 'W&R':
          commonLineData = this.indicsData[this.currentIndics]
          if (commonLineData && commonLineData[eachData.ShiJian]) {
            this.calCommonLinePoints(commonLineData[eachData.ShiJian], commonLinePoints, x, this.maxIndics, this.indicsYPixelRadio, baseHeight)
          }
          break
        case 'DBJJ':
          commonLineData = this.indicsData[this.currentIndics]
          if (commonLineData && commonLineData[eachData.ShiJian]) {
            this.calCommonLinePoints([commonLineData[eachData.ShiJian][0]], commonLinePoints, x, this.maxIndics, this.indicsYPixelRadio, baseHeight)
          }
          break
        default:
          break
      }

      switch (this.mIndics) {
        case 'MA':
          commonLineData = this.indicsData[this.mIndics]

          if (commonLineData && commonLineData[eachData.ShiJian]) {
            let maData = commonLineData[eachData.ShiJian].slice(0, this.maCount)
            this.calCommonLinePoints(maData, mainCommonLinePoints, x, max, candleYPixelRadio, 0)
          }
          break
        case 'BOLL':
          commonLineData = this.indicsData[this.mIndics]
          if (commonLineData && commonLineData[eachData.ShiJian]) {
            this.calCommonLinePoints(commonLineData[eachData.ShiJian], mainCommonLinePoints, x, max, candleYPixelRadio, 0)
          }
          break
        case 'DBJJ':
          commonLineData = this.indicsData[this.mIndics]
          if (commonLineData && commonLineData[eachData.ShiJian]) {
            if (commonLineData[eachData.ShiJian][1] === 1) {
              // 上穿标记进行记录(底部狙击)
              let x1 =
                this.pixelPerWithSeparator * index +
                this.pixelPerWithSeparator / 2 -
                this.pixelPer / 2 + this.leftRangeWidth + this.pixelPer / 2
              let y = (max - eachData.ZuiDiJia) * candleYPixelRadio + 6
              mainCommonTags.push({ x: x1, y: y, label: '狙击', textColor: this.dbjjColor[1], rectColor: this.dbjjColor[2] })
            }
          }
          break
        case 'QSZZ':
          // 准备牛马线数据
          commonLineData = this.indicsData[this.mIndics]
          if (commonLineData && commonLineData[eachData.ShiJian]) {
            this.calCommonLinePoints(commonLineData[eachData.ShiJian], mainCommonLinePoints, x, max, candleYPixelRadio, 0, 4, 2)
          }

          // 准备买卖点标签
          if (commonLineData && commonLineData[eachData.ShiJian]) {
            if (commonLineData[eachData.ShiJian][0] === 1) {
              let x1 =
                this.pixelPerWithSeparator * index +
                this.pixelPerWithSeparator / 2 -
                this.pixelPer / 2 + this.leftRangeWidth + this.pixelPer / 2
              let y = (max - eachData.ZuiDiJia) * candleYPixelRadio
              mainCommonTags.push({ x: x1, y: y, label: 'B', textColor: this.qszzColor[0] })
            } else if (commonLineData[eachData.ShiJian][1] === 1) {
              let x1 =
                this.pixelPerWithSeparator * index +
                this.pixelPerWithSeparator / 2 -
                this.pixelPer / 2 + this.leftRangeWidth + this.pixelPer / 2
              let y = (max - eachData.ZuiGaoJia) * candleYPixelRadio
              mainCommonTags.push({ x: x1, y: y, label: 'S', textColor: this.qszzColor[1], position: 1 })
            }

            // K线修复
            if (commonLineData[eachData.ShiJian][2] === 1) { // 蜡烛图红线
              this.drawCandle(
                index,
                eachData.KaiPanJia,
                eachData.ShouPanJia,
                eachData.ZuiGaoJia,
                eachData.ZuiDiJia,
                true
              )
            } else if (commonLineData[eachData.ShiJian][3] === 1) { // 蜡烛图绿线
              this.drawCandle(
                index,
                eachData.KaiPanJia,
                eachData.ShouPanJia,
                eachData.ZuiGaoJia,
                eachData.ZuiDiJia,
                false
              )
            }
          }
          break
        default:
          break
      }
    })

    // 主图指标 线的颜色，MA, BOLL
    let color = this.maColor
    if (this.mIndics === 'MA') {
      color = this.maColor
    } else if (this.mIndics === 'BOLL') {
      color = this.bollColor
    } else if (this.mIndics === 'DBJJ') {
      color = this.dbjjColor
    } else if (this.mIndics === 'QSZZ') {
      color = this.qszzColor
    }

    mainCommonLinePoints.forEach((eachPoints, index) => {
      canvas.drawPath(eachPoints, color[index])
    })

    if (this.mIndics === 'QSZZ' && !this.qszzBSTag) {
      // 标签不需要绘制
    } else {
      mainCommonTags.forEach((eachLabel, index) => {
        let rectW = this.canvas.measureText(eachLabel.label, this.fontSize, this.fontFamily) + 6
        let rectH = this.fontSize + 8
        let textRectX = eachLabel.x - rectW / 2
        let textRectY = eachLabel.y + 2
        if (eachLabel.rectColor) {
          this.canvas.drawRect(textRectX, textRectY, rectW, rectH, eachLabel.rectColor, 1, eachLabel.rectColor)
        }
        let offset = this.fontSize + 3
        if (eachLabel.position === 1) {
          offset = -this.fontSize / 2
        }
        this.canvas.drawText(eachLabel.label, textRectX + 3, textRectY + offset, this.fontSize + 1, this.fontFamily, eachLabel.textColor || '#FF0F0F')
      })
    }

    if (this.currentIndics === 'MACD') {
      macdPoints.forEach((eachPoints, index) => {
        canvas.drawPath(eachPoints, this.macdColor[index])
      })
    } else if (this.currentIndics === 'KDJ') {
      color = this.kdjColor
    } else if (this.currentIndics === 'RSI') {
      color = this.rsiColor
    } else if (this.currentIndics === 'DMA') {
      color = this.dmaColor
    } else if (this.currentIndics === 'BIAS') {
      color = this.biasColor
    } else if (this.currentIndics === 'CCI') {
      color = this.cciColor
    } else if (this.currentIndics === 'W&R') {
      color = this.w8rColor
    } else if (this.currentIndics === 'DBJJ') {
      color = this.dbjjColor
    }

    commonLinePoints.forEach((eachPoints, index) => {
      canvas.drawPath(eachPoints, color[index])
    })

    // 按压时显示十字光标
    if (this.pressPoint) {
      let {
        x
      } = this.pressPoint
      if (x <= this.leftRangeWidth || x >= (this.canvas.canvasWidth - this.rightRangeWidth)) {
        return
      }
      x = x - this.leftRangeWidth
      const index = parseInt(x / pixelPerWithSeparator, 10)
      let data = this.data[index]
      if (data) {
        // x
        // 绘制按压时垂直方向的辅助线
        this.drawXAxisGridLine(
          (pixelPerWithSeparator * index + pixelPerWithSeparator / 2 + this.leftRangeWidth),
          this.formatXAxisLabel(data.time, true, timeFormatter),
          this.pointerLineColor,
          undefined,
          true,
          true,
          this.pointerTickColor
        )

        // y
        // 绘制按压时水平方向的辅助线
        const y = this.candleYPixelRadio * (this.max - data.ShouPanJia)
        if (y < this.candleChartHeight && y > 0) {
          this.drawYAxisGridLine(
            y,
            data.ShouPanJia,
            this.pointerLineColor,
            y > this.candleChartHeight / 2 ? 'top' : 'bottom',
            true,
            this.pointerTickColor,
            this.pricePrecision
          )
        }

        data = this.getIndicatorSliceData(data)
        // 显示详细信息
        this.longTap(data, 'kline')
        // this.drawTooltip(data);
      }
    }
  }

  // 获取指标切片数据
  getIndicatorSliceData (data) {
    if (this.currentIndics !== 'NONE' && this.currentIndics !== 'VOL') {
      let currentIndicsData = this.indicsData[this.currentIndics]
      if (currentIndicsData && currentIndicsData[data.ShiJian]) {
        let indicsD = currentIndicsData[data.ShiJian]
        let pData = JSON.parse(JSON.stringify(indicsD))
        let pIndicsData = {}
        pIndicsData[this.currentIndics] = pData
        data = Object.assign({}, data, pIndicsData)

        if (this.currentIndics === 'DBJJ' && currentIndicsData) {
          // 追加上一条的数据，用于数据对比
          let timeIndex = this.klineTimes.indexOf(data.ShiJian * 1000)
          if (timeIndex >= 1) {
            let preTime = this.klineTimes[timeIndex - 1] / 1000
            if (preTime) {
              let indicsD = currentIndicsData[preTime]
              if (data && indicsD) {
                data['Pre' + this.currentIndics] = JSON.parse(JSON.stringify(indicsD))
              }
            }
          }
        }
      }
    }

    if (this.mIndics !== 'NONE') {
      let currentIndicsData = this.indicsData[this.mIndics]
      if (currentIndicsData && currentIndicsData[data.ShiJian]) {
        let indicsD = currentIndicsData[data.ShiJian]

        let pData = JSON.parse(JSON.stringify(indicsD))
        let pIndicsData = {}
        pIndicsData[this.mIndics] = pData
        data = Object.assign({}, data, pIndicsData)
      }

      if (this.mIndics === 'QSZZ' && currentIndicsData) {
        // 追加上一条的数据，用于数据对比
        let timeIndex = this.klineTimes.indexOf(data.ShiJian * 1000)
        if (timeIndex >= 1) {
          let preTime = this.klineTimes[timeIndex - 1] / 1000
          if (preTime) {
            let indicsD = currentIndicsData[preTime]
            if (data && indicsD) {
              data['Pre' + this.mIndics] = JSON.parse(JSON.stringify(indicsD))
            }
          }
        }
      }
    }
    return data
  }
  // 最新的指标数据
  getLastIndicatorData () {
    let data = this.data[this.data.length - 1]
    if (!data) return null

    return this.getIndicatorSliceData(data)
  }

  /**
   * 生成通用的 线的点的数组
   * @param {*} data 数据源，一个数组
   * @param {*} points []
   * @param {*} x x坐标
   * @param {*} max 最大值
   * @param {*} yPixelRadio y轴每单位占的像素高度
   * @param {*} baseHeight 基础高度
   * @param {*} offset 返回数据中的线数据的偏移
   * @param {*} count 返回的数据数量
   */
  calCommonLinePoints (data, points, x, max, yPixelRadio, baseHeight = 0, offset = 0, count) {
    count = count ? (count + offset) : data.length
    for (let i = offset, j = count; i < j; i++) {
      if (!points[i]) {
        points[i] = []
      }
      let y = (max - data[i]) * yPixelRadio + baseHeight
      points[i].push([x, y])
    }
  }

  // 生成MACD的DIF和DEA两条线需要的点
  calMACDPoints (data, macdPoints, x, baseHeight, maxIndicsOffset) {
    for (let i = 0, j = data.length; i < j; i++) {
      if (i < 2) {
        // DIF DEA 线
        if (!macdPoints[i]) {
          macdPoints[i] = []
        }
        let y
        if (data[i] > 0) {
          y = (maxIndicsOffset - data[i]) * this.indicsYPixelRadio + baseHeight
        } else if (data[i] === 0) {
          y = maxIndicsOffset * this.indicsYPixelRadio + baseHeight
        } else if (data[i] < 0) {
          y = (maxIndicsOffset - data[i]) * this.indicsYPixelRadio + baseHeight
        }
        macdPoints[i].push([x, y])
      } else if (i === 2) {
        // MACD柱子
      }
    }
  }

  /**
   * 绘制按压时的提示信息
   * @param {Object} data 按压时x轴对应的数据
   */
  drawTooltip (data) {
    let startX = 50 + this.leftRangeWidth
    const fontSize = this.fontSize
    const y = fontSize + 2
    const color = this.getColor(
      this.isUp(data.KaiPanJia, data.ShouPanJia, data.lastClose)
    );

    [{
      label: `日期:${this.formatXAxisLabel(data.time, true)}`,
      labelColor: '#555555'
    },
    {
      label: `开:${stockUtils.formatStockText(data.KaiPanJia, 2)}`
    },
    {
      label: `收:${stockUtils.formatStockText(data.ShouPanJia, 2)}`
    },
    {
      label: `高:${stockUtils.formatStockText(data.ZuiGaoJia, 2)}`
    },
    {
      label: `低:${stockUtils.formatStockText(data.ZuiDiJia, 2)}`
    },
    {
      label: `涨跌:${stockUtils.formatStockText(
        (data.ShouPanJia - data.lastClose) / data.lastClose,
        2,
        '%'
      )}`,
      labelColor: this.getColor(data.ShouPanJia >= data.lastClose)
    },
    {
      label: `量:${stockUtils.formatStockText(data.ChengJiaoLiang, 2, 'K/M')}`
    }
    ].forEach(({
      label,
      labelColor = color
    }) => {
      this.canvas.drawText(label, startX, y, fontSize, this.fontFamily, labelColor)
      startX += this.canvas.measureText(label, fontSize, this.fontFamily) + 10
    })
  }

  /**
   * 画出纵坐标(水平方向的线)
   */
  drawBackground () {
    super.drawBackground()
    const max = this.max
    const min = this.min
    // 绘制K线图最上方的一条水平线，文字(最大值)在线的下面
    this.drawYAxisGridLine(0, max, undefined, 'bottom', undefined, undefined, this.pricePrecision)
    // 绘制K线图最下方的一条水平线，文字(最小值)在线的上面
    this.drawYAxisGridLine(this.candleChartHeight, min, undefined, undefined, undefined, undefined, this.pricePrecision)

    // 绘制中间几条水平线
    for (let i = 1; i < this.horizLineCount; i++) {
      this.drawYAxisGridLine(
        this.candleChartHeight * (i / this.horizLineCount),
        max - (max - min) * (i / this.horizLineCount), undefined, 'center', undefined, undefined, this.pricePrecision, 'dashed'
      )
    }
    switch (this.currentIndics) {
      case 'VOL':
        // 绘制量图最下方的一条水平线
        this.drawYAxisGridLine(this.canvas.canvasHeight, '0', undefined, undefined, undefined, undefined, this.volPrecision)
        // 绘制量图中间的平均线
        this.drawYAxisGridLine(this.canvas.canvasHeight - this.indicsChartHeight / 2, this.maxVolume / 2, undefined, undefined, undefined, undefined, this.volPrecision, 'dashed')
        // 绘制量图最上方的一条水平线
        this.drawYAxisGridLine(
          this.canvas.canvasHeight - this.indicsChartHeight,
          this.maxVolume,
          null,
          'bottom',
          undefined,
          undefined,
          this.volPrecision
        )
        break
      case 'MACD':
        // MACD
        let off = Math.max(Math.abs(this.maxIndics), Math.abs(this.minIndics))
        // 绘制指标图最下方的一条水平线
        this.drawYAxisGridLine(this.canvas.canvasHeight, -(off), undefined, undefined, undefined, undefined, 2)
        // 绘制最上方的一条水平线
        this.drawYAxisGridLine(
          this.canvas.canvasHeight - this.indicsChartHeight,
          off,
          null,
          'bottom',
          undefined,
          undefined,
          2
        )
        // 绘制 MACD的 0刻度线
        this.drawYAxisGridLine(this.canvas.canvasHeight - this.indicsChartHeight / 2, '0', undefined, 'center', undefined, undefined, 2)
        break
      case 'KDJ':
      case 'RSI':
      case 'DMA':
      case 'BIAS':
      case 'CCI':
      case 'W&R':
      case 'DBJJ':
        // 绘制指标图最下方的一条水平线
        this.drawYAxisGridLine(this.canvas.canvasHeight, this.minIndics || 0, undefined, undefined, undefined, undefined, 2)
        // 绘制指标图中间的平均线
        this.drawYAxisGridLine(this.canvas.canvasHeight - this.indicsChartHeight / 2, (this.minIndics + this.maxIndics) / 2, undefined, undefined, undefined, undefined, 2, 'dashed')
        // 绘制最上方的一条水平线
        this.drawYAxisGridLine(
          this.canvas.canvasHeight - this.indicsChartHeight,
          this.maxIndics,
          null,
          'bottom',
          undefined,
          undefined,
          2
        )
        break
      default:
        break
    }
  }

  getPoint (time, price) {
    if (price > this.max || price < this.min) return null
    let timeIndex = this.klineTimes.indexOf(time)

    if (timeIndex === -1) return null

    let x = this.pixelPerWithSeparator * timeIndex + this.pixelPerWithSeparator / 2 - this.pixelPer / 2 + this.leftRangeWidth + this.pixelPer / 2
    let y = this.candleYPixelRadio * (this.max - price)

    return { x, y }
  }

  getLowPricePoint (time) {
    let timeIndex = this.klineTimes.indexOf(time)

    if (timeIndex === -1) return null
    let barData = this.data[timeIndex]
    if (!barData) return null
    let x = this.pixelPerWithSeparator * timeIndex + this.pixelPerWithSeparator / 2 - this.pixelPer / 2 + this.leftRangeWidth + this.pixelPer / 2
    let y = this.candleYPixelRadio * (this.max - barData.ZuiDiJia)
    return { x, y }
  }
  /**
   * 绘制扩展图形
   */
  drawChartExtend () {
    super.drawChartExtend()
  }

  /**
   * 绘制单根K线
   * @param {Number} index 要绘制的单根K线在当前界面显示的K线图数据的位置index
   * @param {Number} open 开盘价
   * @param {Number} close 收盘价
   * @param {Number} top 最高级
   * @param {Number} low 最低价
   * @param {Boolean} isUp 是否上涨
   */
  drawCandle (index, open, close, top, low, isUp) {
    const width = this.pixelPer
    const x =
      this.pixelPerWithSeparator * index +
      this.pixelPerWithSeparator / 2 -
      width / 2 + this.leftRangeWidth
    const y = this.candleYPixelRadio * (this.max - open)
    let height =
      open === close ? 1 : this.candleYPixelRadio * (this.max - close) - y
    height = Math.abs(height) < 1 ? Math.sign(height) : height
    const color = this.getColor(isUp)

    if (width > 1) {
      // 绘制K线的实体
      this.canvas.drawRect(x, y, width, height, color)
    }

    // 上下影线
    const x1 = x + width / 2
    const y1 = this.candleYPixelRadio * (this.max - top)
    const y2 = this.candleYPixelRadio * (this.max - low)
    // 绘制影线，因为实体部分有填充色，所以直接绘制一条从最高价坐标点到最低价坐标点的线
    this.canvas.drawLine(x1, y1, x1, y2, 1, color)
  }

  /**
   * 画量图的柱子
   * @param {Number} index 要绘制的量图的第几个柱子
   * @param {Number} volume
   * @param {Boolean} isUp 是否是上涨状态
   */
  drawVolume (index, volume, isUp) {
    const width = this.pixelPer
    const x =
      this.pixelPerWithSeparator * index +
      this.pixelPerWithSeparator / 2 -
      width / 2 + this.leftRangeWidth
    const y = this.canvas.canvasHeight
    const height = -this.volumeYPixelRadio * volume

    this.canvas.drawRect(x, y, width, height, this.getColor(isUp))
  }

  drawMACDStick (index, v, baseHeight) {
    const width = 1
    const x =
      this.pixelPerWithSeparator * index +
      this.pixelPerWithSeparator / 2 -
      width / 2 + this.leftRangeWidth
    const y = baseHeight + this.indicsChartHeight / 2
    let isUp
    let height
    if (v >= 0) {
      isUp = true
    } else {
      isUp = false
    }
    height = -this.indicsYPixelRadio * v

    this.canvas.drawRect(x, y, width, height, this.getColor(isUp))
  }

  // 手指移动
  panMove (pressed, x, y, deltaX) {
    if (!this.loading) {
      if (pressed) {
        this.pressPoint = {
          x,
          y
        }
        this.redraw()
      } else if (this.pressPoint) {
        this.pressPoint = null
        this.redraw()
      } else {
        let size = Math.round(deltaX / this.pixelPerWithSeparator)
        if (typeof (size) === 'number' && size !== 0) {
          this.reCalculate(size)
          return true
        }
      }
    }
    return false
  }

  /**
   * 缩放
   * scale > 1 说明是放大操作，显示的k线比原来少
   * scale < 1 说明是缩小操作，要显示更多的k线
   * @param {Number} scale 放大或缩小的倍数
   */
  pinchMove (scale) {
    if (!this.loading) {
      let newCount = this.data.length
      try {
        let offsetCount = 5
        const len = newCount
        let beishu = 1
        if (len > 210) {
          beishu = 25
        } else if (len > 180) {
          beishu = 18
        } else if (len > 160) {
          beishu = 16
        } else if (len > 140) {
          beishu = 14
        } else if (len > 120) {
          beishu = 12
        } else if (len > 100) {
          beishu = 10
        } else if (len > 60) {
          beishu = 2
        } else {
          beishu = 1
        }
        if (scale > 1) {
          offsetCount = Math.ceil(scale * beishu)
          newCount -= offsetCount
        } else if (scale < 1) {
          offsetCount = Math.ceil(1 / scale * beishu)
          newCount += offsetCount
        }

        // console.log(newCount);
      } catch (error) {
        if (scale > 1) {
          newCount = this.data.length - 5
        } else if (scale < 1) {
          newCount = this.data.length + 5
        }
      }
      this.reCalculate(0, newCount)
      return true
    }
    return false
  }
}
