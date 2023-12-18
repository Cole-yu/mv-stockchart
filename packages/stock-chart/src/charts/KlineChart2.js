/**
 * 取K线分钟线的数据，K线的柱子变成一条连续的线
 */
import Chart from './Chart.js'
import stockUtils from '../utils/stockUtils'

export default class KlineChart extends Chart {
  initData () {
    super.initData()

    // 初始化数据,取options中data字段作为初始数据
    this.data = this.options.data || [] // 界面上当前显示图的数据
    this.cache = [].concat(this.data) // 缓存好的数据

    this.period = this.options.period || '1min'
    this.split = this.options.split !== undefined ? this.options.split : 1

    // 位置表示显示数据在缓存中开始位置
    this.position = 0

    this.hasMoreData = true

    // 初始需要展示的数据条数,默认80
    this.reCalculate(0, this.options.initCount || 240)

    this.initSubscribe()
  }
  initSubscribe () {
    let param = {
      period: this.period,
      split: this.split,
      start: -1
    }
    // 订阅K线数据变化(更新最新的1条数据)
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

    // 根据画板宽度调整显示数据个数,1像素最多显示一条数据(单条数据小于1像素时,需要调整显示个数),间隙和影线宽度都是固定的1像数
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
    this.data.forEach(eachData => {
      max = Math.max(
        max,
        eachData.ZuiGaoJia || MIN_VALUE
      )
      min = Math.min(
        min,
        eachData.ZuiDiJia || MAX_VALUE
      )
      maxVolume = Math.max(maxVolume, eachData.ChengJiaoLiang)
    })

    // 最大值和最小值范围增加10%
    this.max = max > min ? max + (max - min) * 0.1 : max * 1.1
    this.min = max > min ? min - (max - min) * 0.1 : max * 0.9
    if (this.split === 0 && this.min < 0) {
      this.min = 0
    }
    this.maxVolume = maxVolume

    this.candleChartHeight = this.mainChartHeight
    // K线图Y轴每单位像素
    this.candleYPixelRadio = this.candleChartHeight / (this.max - this.min)
    this.volumeYPixelRadio = this.indicsChartHeight / maxVolume
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

    // 如果count比当前个数小,则直接左偏移向右移动count/2
    if (count < currentCount) {
      leftPosition += Number.parseInt((currentCount - count) / 2, 10)
      currentCount = count
    } else if (count > currentCount) {
      let leftOffsetCount = Number.parseInt((count - currentCount) / 2, 10)

      leftOffsetCount += Math.max(
        leftOffsetCount - (cacheCount - leftPosition - currentCount),
        0
      )

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
      requestCount += (currentCount || requestCount)
      const start = -(requestCount + cacheCount)
      this.loadMoreData(start, requestCount).then(() => {
        this.reCalculate(move, count)
      })
      return
    }

    // 根据新的左偏移位置和新的数据个数重设显示数据data后重画图形
    this.data = this.cache.slice(leftPosition, leftPosition + currentCount)
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

    const klinePromise = this.dataProvider.getKline({
      period: this.period,
      split: this.split,
      start,
      count
    })
    return klinePromise.then(klineData => {
      if (klineData && lastDataProvider === this.dataProvider) {
        // 合并数据到缓存中,判断是否还有更多数据(请求到的数据长度小于count大小或者请求到的数据的时间在cache中已经存在)
        // if (klineData.length < count) {
        //   this.hasMoreData = false;
        // }
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

  /**
   * 格式化日期
   * @param {Number} text 日期，以毫秒为单位
   * @param {Boolean} hasDate 返回格式是否带分钟
   * @returns hasDate ? 'yyyy-MM-dd' : 'yyyy-MM'
   */
  formatXAxisLabel (text, hasDay = false) {
    const date = new Date(text)
    return hasDay
      ? stockUtils.formatDate(date, 'yyyy-MM-dd hh:mm')
      : stockUtils.formatDate(date, 'hh:00')
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
    const kPoints = []
    const pixelPerWithSeparator = this.pixelPerWithSeparator
    const pixelPer = this.pixelPer
    const halfPixelPer = pixelPer / 2
    const hasVolume = this.currentIndics === 'VOL'
    const candleYPixelRadio = this.candleYPixelRadio
    const max = this.max
    let lastLabel
    let currentLabel
    let lastDrawIndex = 0

    // 画出每根k线和量
    /* eslint no-param-reassign: 0 */
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
        // xAxisLabel为年月yyyy-MM
        eachData.xAxisLabel = this.formatXAxisLabel(eachData.time)
      }

      currentLabel = eachData.xAxisLabel

      // 满足条件画x轴坐标(跨月的第一交易日并且两个坐标点之间的距离不小于指定大小)
      if (currentLabel !== lastLabel) {
        lastLabel = currentLabel
        if ((index - lastDrawIndex) * pixelPerWithSeparator > (55 * this.canvas.pixelRadio)) {
          // 第一根和最后一根不画
          let isShow = (index !== 0 && index !== this.data.length - 1)
          this.drawXAxisGridLine(
            (pixelPerWithSeparator * index + halfPixelPer + this.leftRangeWidth),
            currentLabel,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            isShow,
            'dashed'
          )
          lastDrawIndex = index
        }
      }
      if (hasVolume) {
        this.drawVolume(index, eachData.ChengJiaoLiang, eachData.isUp)
      }

      // 以K线的收盘价 画线条
      let x = pixelPerWithSeparator * index + halfPixelPer + this.leftRangeWidth
      if (index === 0) {
        x -= halfPixelPer
      } else if (index === this.data.length - 1) {
        x += halfPixelPer
      }
      kPoints.push([x, candleYPixelRadio * (max - eachData.ShouPanJia)])
    })
    // 绘制收盘价的线条
    // canvas.drawPath(kPoints, 'black');
    this.canvas.fillPath(
      kPoints,
      this.mainChartHeight,
      this.minLineColor,
      this.minFillColor,
      2
    )

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
      const data = this.data[index]
      if (!data) return
      // x
      // 绘制按压时垂直方向的辅助线
      this.drawXAxisGridLine(
        pixelPerWithSeparator * index + pixelPerWithSeparator / 2 + this.leftRangeWidth,
        this.formatXAxisLabel(data.time, true),
        this.pointerLineColor,
        undefined,
        true,
        true,
        this.pointerTickColor
      )

      // y
      // 绘制按压时水平方向的辅助线
      const newY = candleYPixelRadio * (max - data.ShouPanJia)

      if (newY < this.candleChartHeight && newY > 0) {
        this.drawYAxisGridLine(
          newY,
          data.ShouPanJia,
          this.pointerLineColor,
          newY > this.candleChartHeight / 2 ? 'top' : 'bottom',
          true,
          this.pointerTickColor,
          this.pricePrecision
        )
      }
      // 按压点所在的x轴坐标，对应的分时图主图的成交价(的y轴坐标)，即以此时成交价的坐标点绘制一个小圆点
      // this.canvas.drawCircle(x, newY, 3, 'rgba(230, 100, 100, 0.8)');

      // 显示详细信息
      this.longTap(data, 'kline2')
    }
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
      // let lineType = i % 2 === 0 ? 'solid' : 'dashed'
      this.drawYAxisGridLine(
        this.candleChartHeight * (i / this.horizLineCount),
        max - (max - min) * (i / this.horizLineCount), undefined, 'center', undefined, undefined, this.pricePrecision, 'dashed'
      )
    }

    const hasVolume = this.currentIndics === 'VOL'
    if (hasVolume) {
    // 绘制量图最下方的一条水平线
      this.drawYAxisGridLine(this.canvas.canvasHeight, '0', undefined, undefined, undefined, undefined, this.volPrecision)
      // 绘制量图最上方的一条水平线
      this.drawYAxisGridLine(
        this.canvas.canvasHeight - this.volumeChartHeight,
        this.maxVolume,
        null,
        'bottom',
        undefined,
        undefined,
        this.volPrecision
      )
    }
  }

  /** 扩展图形绘制 */
  drawChartExtend () {

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
}
