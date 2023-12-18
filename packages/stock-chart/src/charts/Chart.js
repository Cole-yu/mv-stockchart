import stockUtils from '../utils/stockUtils'

const noop = function () {}

export default class Chart {
  constructor (dataProvider, options = {}) {
    this.dataProvider = dataProvider
    this.options = options
    // 暴露出去的长按回调
    this.longTap = options.longTap || noop
    // 文本对齐间隔
    this.labelMargin = 2
  }

  /**
   * Canvas中show(chart)方法，addChart(chart)时会调用
   */
  initData () {
    this.simplifiedMode = this.options.simplifiedMode || false
    // 指标 'NONE' || VOL' || 'MACD' || 'KDJ'
    this.currentIndics = this.options.currentIndics || 'VOL'
    // 图表通用参数配置
    this.fontSize = (this.options.fontSize || 12) * this.canvas.pixelRadio
    this.fontFamily = this.options.fontFamily || 'Arial'
    // 上涨 颜色
    this.upColor = this.options.upColor || '#ff0000'
    // 下跌 颜色
    this.downColor = this.options.downColor || '#008000'
    // 坐标轴颜色
    this.gridLineColor = this.options.gridLineColor || '#dddddd'
    // 坐标轴 文字颜色
    this.tickColor = this.options.tickColor || '#555555'
    // 价格 小数位数
    this.pricePrecision = this.options.pricePrecision || 2
    // 数量(量图) 小数位数
    this.volPrecision = this.options.volPrecision || 0
    // 按压时辅助线的颜色
    this.pointerLineColor = this.options.pointerLineColor || '#999999'
    // 按压时辅助线对应标签的颜色
    this.pointerTickColor = this.options.pointerTickColor || '#ffffff'
    // 按压时，提示文字的背景色
    this.tickBackgroundColor = this.options.tickBackgroundColor || '#eeeeee'

    // 分时图-价格线的颜色
    this.minLineColor = this.options.minLineColor || '#0095D9'

    // 分时图-闭合区域的颜色
    if (this.simplifiedMode) {
      let ctx = this.canvas.getCtx()
      if (typeof (this.minFillColor) === 'object') {
        // let fillColor = {
        //  'type': 'LinearGradient',
        //  'layout': [0, 0, 0, 125],
        //  'colors': [[0, 'rgb(11, 22, 33)'], [1, 'rgba(251,176,176,0)']],
        // };
        let minFillColorObj = this.minFillColor
        if (minFillColorObj.type && minFillColorObj.type === 'LinearGradient') {
          let gradient = ctx.createLinearGradient(...minFillColorObj.layout)
          if (minFillColorObj.colors.length > 0) {
            minFillColorObj.colors.forEach(item => {
              // gradient.addColorStop(1,'rgba(251,176,176,0)')
              gradient.addColorStop(item[0], item[1])
            })
          }
        }
      }
      this.minFillColor = gradient
    } else {
      this.minFillColor = this.options.minFillColor || 'rgba(0, 149, 217, 0.2)'
    }

    // 时间轴的高度为fontSize + 4，时间轴即表示时间的坐标轴，它的高度即 9:30 10:30 这些文字的高度
    this.timeAxisHeight = this.fontSize + 8

    this.gridLineWidth = 1

    this.horizLineCount = this.options.horizLineCount || 4

    this.leftRangeWidth = (this.options.leftRangeWidth * this.canvas.pixelRadio) || 0
    this.rightRangeWidth = (this.options.rightRangeWidth * this.canvas.pixelRadio) || 0
    this.chartExtend = this.options.chartExtend
  }

  /**
   * 初始化订阅
   */
  initSubscribe () {
    console.warn('not implemented')
  }

  setCanvas (canvas) {
    // 初始数据
    this.canvas = canvas
    this.initData()
  }

  show () {
    this.canvas && this.canvas.show(this)
  }

  remove () {
    this.canvas && this.canvas.remove(this)
  }

  redraw () {
    if (
      this.canvas &&
      this.canvas.getCurrentChart() === this &&
      this.canvas.canvasWidth &&
      this.canvas.canvasHeight
    ) {
      this.canvas.clear()
      this.initChart()
      this.drawBackground()
      this.drawChart()
      this.drawAxisTicks()
      this.drawChartExtend()
      this.canvas && this.canvas.toggleMask(false)
      this.canvas.drawCanvas()
    }
  }

  /**
   * 设置主图和量图的高度，mainChartHeight 和 volumeChartHeight
   */
  initChart () {
    this.yAxisTicks = []
    const timeAxisHeight = this.timeAxisHeight
    const hasVolume = this.currentIndics === 'VOL'

    // 默认主图和量图的比例为7 : 3
    const height = this.canvas.canvasHeight - timeAxisHeight
    if (this.currentIndics !== 'NONE') {
      this.mainChartHeight = height * 0.7
      this.volumeChartHeight = height * 0.3
      this.indicsChartHeight = height * 0.3
    } else {
      this.mainChartHeight = height
      this.volumeChartHeight = 0
      this.indicsChartHeight = 0
    }
    this.mainChartWidth = this.canvas.canvasWidth - this.leftRangeWidth - this.rightRangeWidth
  }

  /* eslint class-methods-use-this: 0 */
  drawBackground () {
    if (!this.simplifiedMode) {
      // 横轴，水平方向的线
      this.drawYAxisGridLine(0)
      this.drawYAxisGridLine(this.canvas.canvasHeight - 1)
      // 竖轴，垂直方向的线
      this.drawXAxisGridLine(this.leftRangeWidth, undefined, undefined, undefined, undefined, true)
      this.drawXAxisGridLine((this.canvas.canvasWidth - this.rightRangeWidth - 1), undefined, undefined, undefined, undefined, true)
    }
  }

  getPoint (time, price) {
    return null
  }

  getLowPricePoint (time) {
    return null
  }

  drawChartExtend (isMinChart) {
    if (!this.chartExtend) return
    if ((this.chartExtend instanceof Array) && this.chartExtend.length === 0) return

    let boundLeft = this.leftRangeWidth
    let boundRight = this.canvas.canvasWidth - this.rightRangeWidth
    let boundTop = 0
    let boundBottom = this.mainChartHeight
    this.chartExtend.forEach((item, index) => {
      if (item.type === 'label') {
        let data = item.data

        if (data && data instanceof Array) {
          let style = item.style || {}
          let lineColor = style.line || '#FF8245'
          let textColor = style.text || '#FF8245'
          let fillColor = style.background || '#FFEFE7'

          for (let i = 0; i < data.length; i++) {
            let item = data[i]

            let result = this.getPoint(item.time, item.price)

            if (result) {
              let cornerX = result.x + 12
              let cornerY = result.y + 12
              let textRectX = cornerX
              let textRectY = cornerY

              let rectW = this.canvas.measureText(item.text, this.fontSize, this.fontFamily) + 6
              let rectH = this.fontSize + 8

              if (cornerX + rectW > boundRight) {
                cornerX = result.x - 12
                textRectX = cornerX - rectW
              }

              if (cornerY + rectH > boundBottom) {
                cornerY = result.y - 12
                textRectY = cornerY - rectH
              }

              this.canvas.drawCircle(result.x, result.y, 2, lineColor, 1, lineColor)
              this.canvas.drawPath([[result.x, result.y], [cornerX, cornerY]], lineColor, 1)
              this.canvas.drawRect(textRectX, textRectY, rectW, rectH, fillColor, 2, lineColor)
              this.canvas.drawText(item.text, textRectX + 3, textRectY + this.fontSize + 3, this.fontSize, this.fontFamily, textColor)
              if (isMinChart) {
                this.canvas.drawText(item.price, textRectX + 1, textRectY - 3, this.fontSize, this.fontFamily, textColor)
              }
            }
          }
        }
      } else if (item.type === 'tag') {
        let data = item.data

        if (data && data instanceof Array) {
          let style = item.style || {}
          let lineColor = style.line || '#FF8245'
          let textColor = style.text || '#FF8245'
          let fillColor = style.background || '#FFEFE7'

          for (let i = 0; i < data.length; i++) {
            let item = data[i]

            let result = this.getLowPricePoint(item.time)
            if (result) {
              let rectW = this.canvas.measureText(item.text, this.fontSize, this.fontFamily) + 6
              let rectH = this.fontSize + 8
              let textRectX = result.x - rectW / 2
              let textRectY = result.y + 2
              this.canvas.drawRect(textRectX, textRectY, rectW, rectH, fillColor, 2, lineColor)
              this.canvas.drawText(item.text, textRectX + 3, textRectY + this.fontSize + 3, this.fontSize, this.fontFamily, textColor)
            }
          }
        }
      }
    })
  }
  /* eslint class-methods-use-this: 0 */
  drawChart () {
    console.warn('not implemented')
  }

  getLastIndicatorData () {
    return null
  }

  /**
   * 绘制Y轴(水平方向的坐标轴)上的文字
   */
  drawAxisTicks () {
    const yAxisTicks = this.yAxisTicks
    if (yAxisTicks) {
      const canvas = this.canvas
      const tickBackgroundColor = this.tickBackgroundColor
      yAxisTicks.forEach(eachTick => {
        canvas.drawText(
          eachTick.text,
          eachTick.x,
          eachTick.y,
          this.fontSize,
          this.fontFamily,
          eachTick.tickColor,
          eachTick.withBackground && tickBackgroundColor
        )
      })
    }
  }

  formatYAxisLabel (text, precision) {
    // return Chart.formatNumber(text, precision, 'K/M', false);
    // return Chart.formatNumber(text, precision, '', false)
    return stockUtils.formatStockText(text, precision, '', false)
  }

  formatXAxisLabel (text) {
    return text
  }

  getColor (isUp) {
    return isUp ? this.upColor : this.downColor
  }

  /**
   * 绘制水平方向的线条
   * @param {Number} y 起始点Y轴坐标
   * @param {String} text 文字
   * @param {String} color 线条颜色
   * @param {String} position 文字在线条的上面('top')或下面('bottom'),中心(center)
   * @param {Boolean} withBackground 文字是否带背景色
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
    if (lineType === 'solid') {
      this.canvas.drawLine(
        this.leftRangeWidth,
        y,
        (this.canvas.canvasWidth - this.rightRangeWidth),
        y,
        this.gridLineWidth,
        color
      )
    } else if (lineType === 'dashed') {
      this.canvas.createHorzDashedLine(
        this.leftRangeWidth,
        (this.canvas.canvasWidth - this.rightRangeWidth),
        y,
        this.gridLineWidth,
        color
      )
    }
    if (text) {
      // 记录Y轴坐标位置
      const yAxisTicks = this.yAxisTicks
      let x = this.labelMargin
      let formatText = this.formatYAxisLabel(text, precision)
      if (this.leftRangeWidth > 0) {
        let textLen = this.canvas.measureText(formatText, this.fontSize, this.fontFamily)
        if (textLen < this.leftRangeWidth) {
          x = this.leftRangeWidth - textLen - this.labelMargin
        }
      }
      if (x < 0) {
        x = 0
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
        text: formatText,
        x: x,
        y: yAxis,
        tickColor,
        withBackground
      })
    }
  }

  /**
   * 绘制垂直方向的线条
   * @param {Number} x X轴对应坐标
   * @param {String} text 文字
   * @param {String} color 线条颜色
   * @param {Sting} position 文字相对于线条的位置，'middle'表示文字在线条中间,'left'左对齐,'right'文字最右边和线条对齐
   * @param {Boolean} withBackground 文字是否带背景色
   * @param {Boolean} full 是否充满画布，即线条高度是否为画布高度，false则为分时图主图的高度
   * @param {String} tickColor 文字颜色
   * @param {Boolean} showLine 是否画网格线，即 页面上 主图 竖着的 线
   * @param {String} lineType 线条样式，'solid' || 'dashed'
   */
  drawXAxisGridLine (
    x,
    text,
    color = this.gridLineColor,
    position = 'middle',
    withBackground = false,
    full = false,
    tickColor = this.tickColor,
    showLine = true,
    lineType = 'solid'
  ) {
    // 画网格线，即 页面上 主图 竖着的 线
    if (showLine) {
      let y = full ? this.canvas.canvasHeight : this.mainChartHeight
      if (lineType === 'solid') {
        this.canvas.drawLine(
          x,
          0,
          x,
          y,
          this.gridLineWidth,
          color
        )
      } else if (lineType === 'dashed') {
        this.canvas.createVerticalDashedLine(
          x,
          0,
          y,
          this.gridLineWidth,
          color
        )
      }
    }
    if (text) {
      const textWidth = this.canvas.measureText(text, this.fontSize, this.fontFamily)
      const fontSize = this.fontSize
      let textX = x
      switch (position) {
        case 'middle':
          textX = x - textWidth / 2
          break
        case 'left':
          textX = x
          break
        case 'right':
          textX = x - textWidth
          break
        default:
          textX = x
          break
      }
      const textY = this.mainChartHeight + fontSize + 2

      this.canvas.drawText(
        text,
        textX,
        textY,
        fontSize,
        this.fontFamily,
        tickColor,
        withBackground && this.tickBackgroundColor
      )
    }
  }

  /* eslint no-unused-vars: 0 */
  panMove (pressed, x, y, deltaX) {}

  /* eslint no-unused-vars: 0 */
  pinchMove (scale) {}
}
