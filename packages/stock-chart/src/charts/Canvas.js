export default class Canvas {
  constructor ({
    width,
    height,
    pixelRadio,
    canvasId
  } = {}) {
    // 画布显示宽高
    this.width = width || 375
    this.height = height || 500
    this.canvasId = canvasId
    this.pixelRadio = pixelRadio || 2

    this.charts = []
    this.currentChartIndex = 0
  }

  initCanvas () {
    const canvas = document.getElementById(this.canvasId)
    this.ctx = canvas.getContext('2d')
    const ratio = this.pixelRadio
    // 画布实际宽高，即绘图时的宽高
    this.canvasWidth = this.width * ratio
    this.canvasHeight = this.height * ratio
  }

  getCtx () {
    !this.ctx && this.initCanvas()
    const ctx = this.ctx
    return ctx
  }

  redraw () {
    this.initCanvas()
    const currentChart = this.getCurrentChart()
    if (currentChart) {
      currentChart.redraw()
    }
  }

  getCurrentChart () {
    return this.charts[this.currentChartIndex]
  }

  show (chart) {
    if (chart) {
      const index = this.charts.indexOf(chart)
      if (index >= 0) {
        this.currentChartIndex = index
        // 这里很重要！如果chart已存在，重新订阅
        chart.initSubscribe()
      } else {
        this.currentChartIndex = this.charts.length
        this.addChart(chart)
      }
    }
    this.redraw()
  }

  addChart (chart) {
    this.charts.push(chart)
    chart.setCanvas(this)
  }

  clear () {
    this.ctx && this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight)
    this.ctx.save()
  }

  drawCanvas () {
    if (this.ctx) {
      this.ctx.restore()
    }
  }

  touchstart (event) {
    this.lastX = event.changedTouches[0].clientX * this.pixelRadio
  }

  touchmove (event, deltaX) {
    const chart = this.getCurrentChart()
    const touch = event.touches[0]
    const moveToX = touch.pageX * this.pixelRadio
    const moveToY = touch.pageY * this.pixelRadio
    deltaX = deltaX * this.pixelRadio
    const result =
      chart && chart.panMove(this.pressed, moveToX, moveToY, deltaX)
    result && (this.lastX = moveToX)
  }

  touchend () {
    this.pressed = false
    this.lastX = 0
    const chart = this.getCurrentChart()
    chart && chart.panMove(this.pressed)
  }

  /**
   * 长按事件处理
   * @param {Object} event 手指触摸event对象
   */
  longtap (event) {
    this.pressed = true
    const chart = this.getCurrentChart()
    const touch = event.touches[0]
    let moveToX = 0
    let moveToY = 0
    if (touch.offsetX && touch.offsetY) {
      // PC端逻辑
      moveToX = touch.offsetX * this.pixelRadio
      moveToY = touch.offsetY * this.pixelRadio
    } else {
      // 移动端逻辑
      moveToX = (touch.pageX - event.target.offsetLeft) * this.pixelRadio
      moveToY = (touch.pageY - event.target.offsetTop) * this.pixelRadio
    }
    chart && chart.panMove(this.pressed, moveToX, moveToY)
  }

  pinch (event, scale) {
    if (!this.pressed) {
      let chart = this.getCurrentChart()
      chart && chart.pinchMove(scale)
    }
  }

  /**
   * 显示和隐藏mask层
   */
  toggleMask (show) {}

  /**
   * 画一条线
   * @param {number} x1 起始位置x轴坐标
   * @param {*} y1 起始位置y轴坐标
   * @param {*} x2 结束位置x轴坐标
   * @param {*} y2 结束位置y轴坐标
   * @param {*} lineWidth 线条宽度
   * @param {*} style 边框颜色
   */
  drawLine (x1, y1, x2, y2, lineWidth, style) {
    const ctx = this.ctx
    ctx.beginPath()
    ctx.lineWidth = lineWidth
    ctx.strokeStyle = style
    ctx.moveTo(
      this.normalizeDrawLinePoint(x1),
      this.normalizeDrawLinePoint(y1)
    )
    ctx.lineTo(
      this.normalizeDrawLinePoint(x2),
      this.normalizeDrawLinePoint(y2)
    )
    ctx.stroke()
  }

  /**
   * 绘制水平方向的dashed线
   * @param {*} x1 起始点x1坐标
   * @param {*} x2 结束点x2坐标
   * @param {*} y y轴坐标
   * @param {*} lineWidth 线条宽度
   * @param {*} style 边框颜色
   */
  createHorzDashedLine (x1, x2, y, lineWidth, style) {
    const ctx = this.ctx
    ctx.beginPath()
    ctx.lineWidth = lineWidth
    ctx.strokeStyle = style
    const splitLineLen = 8
    const dashLen = splitLineLen / 2
    let dX = x2 - x1
    let count = (dX / splitLineLen + 0.5) << 0
    for (let i = 0; i < count; i++) {
      ctx.moveTo(
        this.normalizeDrawLinePoint(x1),
        this.normalizeDrawLinePoint(y)
      )
      ctx.lineTo(
        this.normalizeDrawLinePoint(x1 + dashLen),
        this.normalizeDrawLinePoint(y)
      )
      x1 += splitLineLen
    }
    ctx.stroke()
  }

  /**
   * 绘制垂直方向的dashed线
   * @param {*} x x坐标
   * @param {*} y1 起始y1坐标
   * @param {*} y2 结束y2坐标
   * @param {*} lineWidth 线条宽度
   * @param {*} style 边框颜色
   */
  createVerticalDashedLine (x, y1, y2, lineWidth, style) {
    const ctx = this.ctx
    ctx.beginPath()
    ctx.lineWidth = lineWidth
    ctx.strokeStyle = style
    const splitLineLen = 8
    const dashLen = splitLineLen / 2
    let dY = y2 - y1
    let count = (dY / splitLineLen + 0.5) << 0
    for (let i = 0; i < count; i++) {
      ctx.moveTo(
        this.normalizeDrawLinePoint(x),
        this.normalizeDrawLinePoint(y1)
      )
      ctx.lineTo(
        this.normalizeDrawLinePoint(x),
        this.normalizeDrawLinePoint(y1 + dashLen)
      )
      y1 += splitLineLen
    }
    ctx.stroke()
  }

  /**
   * 绘制文字
   * @param {String} text 文字
   * @param {Number} pointX 绘制文字的起始点的x轴坐标
   * @param {Number} pointY 绘制文字的起始点的y轴坐标
   * @param {Number} fontSize 字体大小
   * @param {String} fontFamily 字体大小
   * @param {String} fontStyle 字体颜色
   * @param {String} backgroundStyle 背景色
   */
  drawText (text, pointX, pointY, fontSize, fontFamily, fontStyle, backgroundStyle = null) {
    const ctx = this.ctx
    ctx.font = `${fontSize}px ${fontFamily}`
    const textWidth = this.measureText(text, fontSize)
    const x = Math.min(Math.max(pointX, 0), this.canvasWidth - textWidth)
    const y = pointY

    if (backgroundStyle) {
      // 背景边框
      ctx.fillStyle = backgroundStyle
      ctx.rect(x - 2, y + 2, textWidth + 4, -(fontSize + 4))
      ctx.fill()
    }

    ctx.beginPath()

    ctx.fillStyle = fontStyle
    ctx.fillText(text, x, y)
  }

  /**
   * 以一系列点的位置集合绘制一条连续的路径，并以结束点、x坐标轴、起始点绘制一块闭合区域，填充其颜色
   * 例：分时图的主图
   * @param {Array} points 点的位置坐标集合，例：[[x1,y1],[x2,y2],[x3,y3],...]
   * @param {*} y0
   * @param {*} strokeColor 线条颜色
   * @param {*} fillStyle 填充绘画的颜色
   * @param {*} lineWidth 线条宽度
   */
  fillPath (points, y0, strokeColor, fillStyle, lineWidth = 1) {
    const ctx = this.ctx
    ctx.beginPath()
    points.forEach((eachPoint, index) => {
      if (index === 0) {
        ctx.moveTo(eachPoint[0], eachPoint[1])
      } else {
        ctx.lineTo(eachPoint[0], eachPoint[1])
      }
    })
    ctx.lineWidth = lineWidth
    ctx.strokeStyle = strokeColor
    ctx.lineJoin = 'round'
    ctx.stroke()

    if (points.length > 1) {
      ctx.lineWidth = 0
      ctx.lineTo(points[points.length - 1][0], y0)
      ctx.lineTo(points[0][0], y0)
      ctx.closePath()
      ctx.fillStyle = fillStyle
      ctx.fill()
    } else {
      ctx.closePath()
    }
  }

  /**
   * 以一系列点的位置集合绘制一条连续的路径
   * @param {*} points 点的位置坐标集合，例：[[x1,y1],[x2,y2],[x3,y3],...]
   * @param {*} color 线条颜色
   * @param {*} lineWidth 线条宽度
   */
  drawPath (points, color, lineWidth = 1) {
    const ctx = this.ctx
    ctx.beginPath()
    ctx.lineJoin = 'round'
    ctx.lineWidth = lineWidth
    ctx.strokeStyle = color
    points.forEach((eachPoint, index) => {
      if (index === 0) {
        ctx.moveTo(eachPoint[0], eachPoint[1])
      } else {
        ctx.lineTo(eachPoint[0], eachPoint[1])
      }
    })

    ctx.stroke()
    ctx.closePath()
  }

  /**
   * 创建一个矩形
   * @param {Number} x 矩形路径左上角的x坐标
   * @param {Number} y 矩形路径左上角的y坐标
   * @param {Number} width 矩形路径的宽度
   * @param {Number} height 矩形路径的高度
   * @param {Number} fillStyle 矩形的填充颜色
   * @param {Number} lineWidth 线条宽度
   * @param {String} strokeStyle 线条颜色
   */
  drawRect (x, y, width, height, fillStyle, lineWidth = 0, strokeStyle) {
    const ctx = this.ctx
    if (x && y && width && height) {
      ctx.beginPath()
      ctx.rect(x, y, width, height)
      ctx.closePath()
      ctx.fillStyle = fillStyle
      ctx.fill()

      if (lineWidth && strokeStyle) {
        ctx.lineWidth = lineWidth
        ctx.strokeStyle = strokeStyle
        ctx.stroke()
      }
    }
  }

  /**
   * 绘制一个圆，并填充其颜色
   * @param {Number} x 圆心x轴坐标
   * @param {Number} y 圆心y轴坐标
   * @param {Number} radius 圆的半径
   * @param {String} fillStyle 填充颜色
   * @param {Number} lineWidth 线条宽度
   * @param {String} strokeStyle 线条颜色
   */
  drawCircle (x, y, radius, fillStyle, lineWidth = 0, strokeStyle) {
    const ctx = this.ctx
    ctx.beginPath()
    ctx.arc(x, y, radius, 0, Math.PI * 2)
    ctx.closePath()
    ctx.fillStyle = fillStyle
    ctx.fill()

    if (lineWidth && strokeStyle) {
      ctx.lineWidth = lineWidth
      ctx.strokeStyle = strokeStyle
      ctx.stroke()
    }
  }

  normalizeDrawLinePoint (point) {
    if (this.pixelRadio === 1) {
      const intPoint = parseInt(point, 10)
      return intPoint > point ? intPoint - 0.5 : intPoint + 0.5
    }
    return point
  }

  /**
   * 计算文字的宽度
   * @param {String} text 文字
   */
  measureText (text, fontSize, fontFamily) {
    const ctx = this.ctx
    ctx.font = `${fontSize}px ${fontFamily}`
    return ctx.measureText(text).width
    // 计算text的半角长度后乘以每个半角字符的宽度
    // return text.replace(/[\u0391-\uFFE5]/g, 'aa').length * fontSize
    // return text.replace(/[\u0391-\uFFE5]/g, 'aa').length * 5 * this.pixelRadio
  }
}
