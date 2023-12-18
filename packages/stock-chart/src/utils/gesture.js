/**
 * 专为绘图封装的手势库
 * 支持事件：
 * 长按 longTap
 * 缩放 pinch
 * 移动(k线图) move
 * 触摸结束 end
 * 单击(切换分时和K线) tap
 */
// 默认配置
const OPTION = {
  longTapTime: 600
}
const ABS = Math.abs
export default class Gesture {
  constructor (target, option = {}) {
    // 获取目标元素
    this.target = typeof target === 'string' ? document.querySelector(target) : target
    // 绑定基本事件，需要注意this的指向
    this._start = this._start.bind(this)
    this._move = this._move.bind(this)
    this._end = this._end.bind(this)
    this._cancel = this._cancel.bind(this)
    this.target.addEventListener('touchstart', this._start, false)
    this.target.addEventListener('touchmove', this._move, false)
    this.target.addEventListener('touchend', this._end, false)
    this.target.addEventListener('touchcancel', this._cancel, false)

    this._init()
    this.handles = {} // 用于存放回调函数的对象
    this.option = Object.assign({}, OPTION, option)
  }
  _init () {
    this.touch = {} // 记录刚触摸的手指
    this.movetouch = {} // 记录移动过程中变化的手指参数
    this.isLongTap = false
    // 上一次两指间 x、y轴 的距离差
    this.preVector = {
      x: 0,
      y: 0
    }
    this.params = {
      zoom: 1, // 触摸和移动时，缩放的倍数
      deltaX: 0, // 触摸和移动时手指每次变化的横坐标
      direction: '' // 滑动的方向
    }
  }
  _start (e) {
    this._cancelTouchEnd()
    this._cancelLongTap()
    let point = e.touches ? e.touches[0] : e // 获得触摸参数
    let now = Date.now() // 当前时间
    this.touch.startX = point.pageX
    this.touch.startY = point.pageY
    this.touch.startTime = now
    if (e.touches.length > 1) {
      // 这里为处理多个手指触摸的情况
      let point2 = e.touches[1] // 获取第二个手指信息
      // 两根手指x轴和y轴的距离差
      this.preVector = {
        x: point2.pageX - this.touch.startX,
        y: point2.pageY - this.touch.startY
      }
    } else {
      this.longTapTimeout = window.setTimeout(() => {
        this.isLongTap = true
        this._emit('longTap', e)
      }, ~~this.option.longTapTime)
    }
  }
  _move (e) {
    this._cancelLongTap()
    this._cancelTouchEnd()
    let shouldPrevent = false // 是否需要阻止默认行为(页面滚动)
    let point = e.touches ? e.touches[0] : e
    if (e.touches.length > 1) {
      shouldPrevent = true
      // 当手指移动时，如果已经触发了长按事件，则按照业务，应该继续长按事件
      if (this.isLongTap) {
        this._emit('longTap', e)
      } else {
        // 如果没有触发过长按事件，则按多个手指触摸移动的情况
        let point2 = e.touches[1]
        let v = {
          x: point2.pageX - point.pageX,
          y: point2.pageY - point.pageY
        }
        // 根据上一次两指间的距离(x轴的距离差)和本次两指间的距离，计算缩放倍数
        if (this.preVector.x && v.x) {
          // 计算放大或者缩小的倍数（利用前后两指间的距离）
          this.params.zoom = this.calcLen(v) / this.calcLen(this.preVector)
          this._emit('pinch', e)
        }
        // 更新最后上一个向量为当前向量
        this.preVector.x = v.x
        this.preVector.y = v.y
      }
    } else {
      // 当手指移动时，如果已经触发了长按事件，则按照业务，应该继续长按事件
      if (this.isLongTap) {
        shouldPrevent = true
        this._emit('longTap', e)
      } else {
        if ((this.movetouch.x) || (this.movetouch.y)) {
          let deltaX = ~~(point.pageX - (this.movetouch.x || 0))
          let deltaY = ~~(point.pageY - (this.movetouch.y || 0))
          if (ABS(deltaX) < ABS(deltaY)) {
            if (deltaY < 0) {
              this.params.direction = 'up'
            } else {
              this.params.direction = 'down'
            }
          } else {
            shouldPrevent = true
            if (deltaX < 0) {
              this.params.direction = 'left'
            } else {
              this.params.direction = 'right'
            }
          }
        }
        if (this.params.direction === 'left' || this.params.direction === 'right') {
          // 记录移动过程中与上一次移动的相对坐标
          if (this.movetouch.x) {
            this.params.deltaX = point.pageX - this.movetouch.x
          } else {
            this.params.deltaX = 0
          }
          this._emit('move', e)
        }
      }
      // 更新移动中的手指参数
      this.movetouch.x = point.pageX
      this.movetouch.y = point.pageY
    }
    if (shouldPrevent) {
      e.preventDefault()
    }
  }
  _end (e) {
    this._touchEnd(e)
  }
  _cancel (e) {
    this._touchEnd(e)
  }
  _touchEnd (e) {
    if (this.isLongTap) {
      // 如果当前处于长按，则隔一段时间后再重绘图表(为了让长按的辅助线多停留一会)
      this.touchEndTimeout = window.setTimeout(() => {
        this._emit('end', e)
        this._init()
      }, 1500)
    } else {
      let shouldTap = false // 是否应该触发单击事件tap
      if (e.touches && e.touches.length > 0) {
        // 如果touchend事件触发时屏幕上还有手指则不触发单击
        shouldTap = false
      } else {
        // 触发单击事件的条件
        let timestamp = Date.now()
        // 1.本次手指触碰的时间在300ms以内
        // 2.手指的距离变化在30px内
        if ((timestamp - this.touch.startTime) <= 300) {
          if (this.movetouch.x === undefined && this.movetouch.y === undefined) {
            // 没有movetouch说明没有触发touchmove事件
            shouldTap = true
          } else {
            let deltaX = ~~((this.movetouch.x || 0) - this.touch.startX)
            let deltaY = ~~((this.movetouch.y || 0) - this.touch.startY)
            const condition2 = this.movetouch.x !== undefined && ABS(deltaX) <= 30
            const condition3 = this.movetouch.y !== undefined && ABS(deltaY) <= 30
            if (condition2 && condition3) {
              shouldTap = true
            }
          }
        }
      }
      this.handleTouchEnd(e)
      if (shouldTap) {
        this._emit('tap', e)
      }
    }
  }
  handleTouchEnd (e) {
    // 手指离开，取消长按事件定时器
    this._cancelLongTap()
    this._emit('end', e)
    this._init()
  }
  _emit (type, e) {
    if (this.handles[type] && typeof this.handles[type] === 'function') {
      this.handles[type].call(this.target, e, JSON.parse(JSON.stringify(this.params)))
    }
  }
  /**
   * 取消长按定时器
   */
  _cancelLongTap () {
    if (this.longTapTimeout) {
      window.clearTimeout(this.longTapTimeout)
      this.longTapTimeout = null
    }
  }
  /**
   * 取消touchend定时器
   */
  _cancelTouchEnd () {
    if (this.touchEndTimeout) {
      window.clearTimeout(this.touchEndTimeout)
      this.touchEndTimeout = null
    }
  }
  /**
   * 取消所有的定时器
   */
  cancelAll () {
    this._cancelLongTap()
    this._cancelTouchEnd()
  }
  /**
   * 计算两点间的距离（直角三角形斜边的长度）
   * @param {Object} v v.x两点间x轴距离差,v.y两点间y轴距离差
   */
  calcLen (v) {
    return Math.sqrt(v.x * v.x + v.y * v.y)
  }
  /**
   * 给目标元素添加事件
   * @param {String} type 事件名
   * @param {*} callback 回调函数
   */
  on (type, callback) {
    this.handles[type] = callback
  }
  /**
   * 移除目标元素的事件
   * @param {String} type 事件名
   */
  off (type) {
    this.handles[type] = null
  }
  destroy () {
    this.cancelAll()
    this.target.removeEventListener('touchstart', this._start)
    this.target.removeEventListener('touchmove', this._move)
    this.target.removeEventListener('touchend', this._end)
    this.target.removeEventListener('touchcancel', this._cancel)
    this.isLongTap = false
    this.params = this.handles = this.movetouch = this.touch = this.preVector = null
    return false
  }
}
