import Chart from './Chart.js'
import stockUtils from '../utils/stockUtils'

export default class MinChart extends Chart {
  /**
   * 初始化数据。在这里会通过DataProvider订阅数据，有数据推送到达时重画
   */
  initData () {
    super.initData()
    // 建议最小时间间隔
    this.customInterval = this.options.customInterval || 60
    // 均线的颜色
    this.avgPriceColor = this.options.avgPriceColor || '#EB5F15'
    // 多日分时 days,最大为10，值为5时表示取4天的历史分时加当天的分时
    this.days = this.options.days || 5

    this.cache = null

    this.canvas && this.canvas.toggleMask(true)

    this.initSubscribe()
  }
  initSubscribe () {
    // 订阅数据,有数据推送到达时重画
    this.dataProvider.subMultiMin(data => {
      this.cache = data
      this.redraw()
    }, {
      days: this.days
    })
  }

  /**
   * 计算X轴和Y轴的最小单位像素
   * minYPixelRadio：主图Y轴最小单位像素
   * volumeYPixelRadio：量图Y轴最小单位像素
   * pixelPer：X轴最小单位像素
   */
  initChart () {
    super.initChart()

    // 是否显示均价, 默认true
    this.hasAvgPrice = this.options.hasAvgPrice !== false

    const lastClose = this.cache.lastClose

    // 计算最大和最小值
    const MAX_VALUE = Number.MAX_VALUE
    const MIN_VALUE = Number.MIN_VALUE
    let min = MAX_VALUE
    let max = 0
    let maxVolume = 0
    if (lastClose) {
      // 昨收价存在,取距离昨收价最大偏移量作为最大绝对值
      let maxOffset = 0
      let eachData
      Object.keys(this.cache).forEach(key => {
        eachData = this.cache[key]
        if (eachData && eachData.ChengJiaoJia) {
          maxOffset = Math.max(
            maxOffset,
            Math.abs(eachData.ChengJiaoJia - lastClose)
          )
          maxVolume = Math.max(maxVolume, eachData.ChengJiaoLiang)
        }
      })
      max = lastClose + maxOffset
      min = lastClose - maxOffset
    } else {
      // 昨收价不存在时
      let eachData
      Object.keys(this.cache).forEach(key => {
        eachData = this.cache[key]
        if (eachData && eachData.ChengJiaoJia) {
          max = Math.max(max, eachData.ChengJiaoJia || MIN_VALUE)
          min = Math.min(min, eachData.ChengJiaoJia || MAX_VALUE)
          maxVolume = Math.max(maxVolume, eachData.ChengJiaoLiang)
        }
      })
    }

    // 最大值和最小值范围增加10%
    this.max = max > min ? max + (max - min) * 0.1 : max * 1.1
    this.min = max > min ? min - (max - min) * 0.1 : max * 0.9
    if (this.min < 0) {
      this.min = 0
    }
    this.maxVolume = maxVolume

    this.minChartHeight = this.mainChartHeight
    // 主图的Y轴最小单位像素：主图高度 / (最大数值 - 最小数值)
    this.minYPixelRadio = this.minChartHeight / (this.max - this.min)
    this.volumeYPixelRadio = this.indicsChartHeight / maxVolume
    // X轴最小单位像素
    this.pixelPer = this.mainChartWidth / this.cache.minTimes.length
  }

  /* eslint class-methods-use-this: 0 */
  /**
   * 格式化日期
   * @param {Number} text 日期，以毫秒为单位
   * @param {Boolean} hasDate 返回格式是否带年月日
   * @returns hasDate ? 'yyyy-MM-dd hh:mm' : 'hh:mm'
   */
  formatXAxisLabel (text, hasDate = false) {
    const date = new Date(text)
    return hasDate
      ? stockUtils.formatDate(date, 'yyyy-MM-dd hh:mm')
      : stockUtils.formatDate(date, 'MM-dd')
  }

  /**
   * 重绘
   */
  redraw () {
    if (this.cache) {
      super.redraw()
    }
  }

  drawChart () {
    const hasVolume = this.currentIndics === 'VOL'
    const minTimes = this.cache.minTimes
    const pixelPer = this.pixelPer // X轴最小单位像素
    const pricePoints = []
    const avgPricePoints = []
    const hasAvgPrice = this.hasAvgPrice
    let lastPrice = this.cache.lastClose

    // 如果数据量大于300个数据则按60分间隔否则按30分间隔
    const interval = minTimes.length > 300 ? 60 : 30
    let lastTickIndex = 0 // ?
    let lastLabel
    let currentLabel
    let lastDrawIndex = -1

    minTimes.forEach((time, index) => {
      const minData = this.cache[time]
      if (minData) {
        const isUp = (minData.isUp = minData.ChengJiaoJia >= lastPrice)
        const x1 = pixelPer * index + this.leftRangeWidth
        const x2 = x1 + pixelPer / 2
        minData.ChengJiaoJia &&
          pricePoints.push([
            x2,
            (this.max - minData.ChengJiaoJia) * this.minYPixelRadio
          ])
        hasAvgPrice &&
          minData.JunJia &&
          avgPricePoints.push([
            x2,
            (this.max - minData.JunJia) * this.minYPixelRadio, !(minData.JunJia > this.max || minData.JunJia < this.min)
          ])
        hasVolume && this.drawVolume(index, minData.ChengJiaoLiang, isUp)
        lastPrice = minData.ChengJiaoJia
      }
      currentLabel = this.formatXAxisLabel(time)
      if (currentLabel !== lastLabel) {
        lastLabel = currentLabel
        if ((lastDrawIndex === -1 && index > 0) || (index - lastDrawIndex) * pixelPer > (55 * this.canvas.pixelRadio)) {
          lastDrawIndex = index
          // 第一根和最后一根不画
          let isShow = (index !== 0 && index !== minTimes.length - 1)
          this.drawXAxisGridLine(
            pixelPer * index + pixelPer / 2 + this.leftRangeWidth,
            currentLabel,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            isShow,
            'dashed'
          )
        }
      }
    })
    // 绘制分时图的主图部分，一段连续不断的线条，和其与坐标轴形成的闭合区域
    this.canvas.fillPath(
      pricePoints,
      this.minChartHeight,
      this.minLineColor,
      this.minFillColor
    )
    // 均价，分时图主图部分的一段连续的线条
    hasAvgPrice && this.canvas.drawPath(avgPricePoints, this.avgPriceColor)

    // 按压时显示十字光标
    if (this.pressPoint) {
      let {
        x,
        y
      } = this.pressPoint
      if (x <= this.leftRangeWidth || x >= (this.canvas.canvasWidth - this.rightRangeWidth)) {
        return
      }
      x = x - this.leftRangeWidth
      const index = Number.parseInt(x / pixelPer, 10)
      const minTime = minTimes[index]
      const data = this.cache[minTime]
      if (data) {
        // x
        x = pixelPer * index + pixelPer / 2 + this.leftRangeWidth
        // 绘制按压时垂直方向的线条
        this.drawXAxisGridLine(
          x,
          this.formatXAxisLabel(minTime, true),
          this.pointerLineColor,
          undefined,
          true,
          true,
          this.pointerTickColor
        )

        // y
        const price = data.ChengJiaoJia
        y = (this.max - price) * this.minYPixelRadio
        // 绘制按压时水平方向的线条
        this.drawYAxisGridLine(
          y,
          price,
          this.pointerLineColor,
          y > this.minChartHeight / 2 ? 'top' : 'bottom',
          true,
          this.pointerTickColor // this.getColor(data.ChengJiaoJia >= this.cache.lastClose)
        )
        // 按压点所在的x轴坐标，对应的分时图主图的成交价(的y轴坐标)，即以此时成交价的坐标点绘制一个小圆点
        this.canvas.drawCircle(x, y, 3, 'rgba(230, 100, 100, 0.8)')

        // 显示详细信息
        let showData = Object.assign({}, {
          lastClose: this.cache.lastClose
        }, data)
        this.longTap(showData, 'multi-min')
      }
    }
  }

  /**
   * 画量图的柱子
   * @param {Number} index 时间节点minTimes数组内数据的index
   * @param {Number} volume 成交量
   * @param {Boolean} isUp 成交价是否大于昨收
   */
  drawVolume (index, volume, isUp) {
    const x = this.pixelPer * index + this.leftRangeWidth
    // 以画布最下面坐标线上的点为起始点，这时Y坐标为画布高度
    const y = this.canvas.canvasHeight
    const width = Math.max(0.5, this.pixelPer - 1)
    // 矩形高度为负值，则会以起始点 向上(界面上看起来) 绘图
    const height = -this.volumeYPixelRadio * volume

    this.canvas.drawRect(x, y, width, height, this.getColor(isUp))
  }

  /**
   * 画出横坐标和网格线
   */
  drawBackground () {
    super.drawBackground()
    const lastClose = this.cache.lastClose
    const max = this.max
    const min = this.min

    // 画出横坐标和网格线
    // 画x轴 横坐标，从坐标原点(0, 0)到右侧(画布宽度, 0)
    this.drawYAxisGridLine(
      0,
      max,
      undefined,
      'bottom',
      undefined,
      this.getColor(true),
      this.pricePrecision
    )
    // 画从(0, 图表高度)到(画布宽度, 图表高度)
    this.drawYAxisGridLine(
      this.minChartHeight,
      min,
      undefined,
      undefined,
      undefined,
      this.getColor(false),
      this.pricePrecision
    )
    // 画 2/4即二分之一处的(横向的)网格线
    this.drawYAxisGridLine(
      this.minChartHeight / 2,
      lastClose || max - (max - min) / 2,
      undefined,
      'center',
      undefined,
      undefined,
      this.pricePrecision,
      'dashed'
    )
    for (let i = 1; i < this.horizLineCount; i++) {
      if (i !== (this.horizLineCount / 2)) {
        this.drawYAxisGridLine(
          this.minChartHeight * (i / this.horizLineCount),
          max - (max - min) * (i / this.horizLineCount),
          undefined,
          'center',
          undefined,
          this.getColor(i < this.horizLineCount / 2),
          this.pricePrecision,
          'dashed'
        )
      }
    }
    // 画数量图的x轴，即最底部的一条横线
    super.drawYAxisGridLine(
      this.canvas.canvasHeight,
      '0',
      undefined,
      undefined,
      undefined,
      undefined,
      this.volPrecision
    )
    // 画数量图顶部的一条网格线
    super.drawYAxisGridLine(
      this.canvas.canvasHeight - this.volumeChartHeight,
      this.maxVolume,
      undefined,
      'bottom',
      undefined,
      undefined,
      this.volPrecision
    )
  }

  /** 扩展图形绘制 */
  drawChartExtend () {

  }

  /**
   * 绘制水平方向的线条
   * @param {Number} y 起始点Y轴坐标
   * @param {String} text 文字
   * @param {String} color 线条颜色
   * @param {String} position 线条在文字的上面('top')或下面('bottom'),中心(center)
   * @param {Boolean} withBackground 是否带背景色
   * @param {String} tickColor 文字颜色
   * @param {Number} precision 文字格式化的小数位数
   * @param {String} lineType 线条样式，'solid' || 'dashed'
   */
  drawYAxisGridLine (
    y,
    text,
    color = this.gridLineColor,
    position = 'top',
    withBackground = false,
    tickColor = this.tickColor,
    precision = 2,
    lineType = 'solid'
  ) {
    super.drawYAxisGridLine(
      y,
      text,
      color,
      position,
      withBackground,
      tickColor,
      precision,
      lineType
    )

    if (text) {
      const yAxisTicks = this.yAxisTicks
      const rightText = stockUtils.formatStockText(
        (text - this.cache.lastClose) / this.cache.lastClose,
        2,
        '%',
        false
      )
      let x
      if (this.rightRangeWidth > 0) {
        x = this.canvas.canvasWidth - this.rightRangeWidth + this.labelMargin
      } else {
        x = this.canvas.canvasWidth - this.canvas.measureText(rightText, this.fontSize, this.fontFamily) - this.labelMargin
      }
      let yAxis = y
      switch (position) {
        case 'top':
          yAxis = y - 2
          break
        case 'bottom':
          yAxis = y + this.fontSize + 2
          break
        case 'center':
          yAxis = y + (this.fontSize / 2) - 1
          break
        default:
          yAxis = y
          break
      }
      yAxisTicks.push({
        text: rightText,
        x: x,
        y: yAxis,
        tickColor,
        withBackground
      })
    }
  }

  /**
   * 触摸移动的处理
   * @param {Object} pressed 当前是否处于触摸状态
   * @param {} x 当前触摸点的x轴坐标
   * @param {*} y 当前触摸点的y轴坐标
   */
  panMove (pressed, x, y) {
    if (pressed) {
      this.pressPoint = {
        x,
        y
      }
    } else {
      this.pressPoint = null
    }
    this.redraw()
  }
}
