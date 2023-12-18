const OPTION = {
  longTapTime: 600
}
const ABS = Math.abs

export default class Mouse {
  constructor (target, option = {}) {
    // 获取目标元素
    this.target = typeof target === 'string' ? document.querySelector(target) : target
    // 绑定基本事件，需要注意this的指向
    this._start = this._start.bind(this)
    this._move = this._move.bind(this)
    this._end = this._end.bind(this)
    this._pinch = this._pinch.bind(this)
    this._leave = this._leave.bind(this)
    this.target.addEventListener('mousedown', this._start, false)
    this.target.addEventListener('mousemove', this._move, false)
    this.target.addEventListener('mouseup', this._end, false)
    this.target.addEventListener('mouseleave', this._leave, false)
    this.addMouseWheelEvent()

    this._init()
    this.handles = {} // 用于存放回调函数的对象
    this.option = Object.assign({}, OPTION, option)
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

  _emit (type, e) {
    if (this.handles[type] && typeof this.handles[type] === 'function') {
      this.handles[type].call(this.target, e, JSON.parse(JSON.stringify(this.params)))
    }
  }

  _init () {
    this.touch = {} // 记录刚触摸的手指
    this.movetouch = {} // 记录移动过程中变化的手指参数
    this.isLongTap = false
    this.mouseIsPress = false
    this.params = {
      zoom: 1, // 触摸和移动时，缩放的倍数
      deltaX: 0, // 触摸和移动时手指每次变化的横坐标
      direction: '' // 滑动的方向
    }
  }
  _start (e) {
    this._cancelTouchEnd()

    e.touches = []
    e.touches.push(e) // 仿写touchstart事件

    let now = Date.now() // 当前时间
    this.touch.startX = e.pageX
    this.touch.startY = e.pageY
    this.touch.startTime = now

    // this.movetouch.x = e.pageX;
    // this.movetouch.y = e.pageY;
    this.mouseIsPress = true
    // 如果当前处于长按(isLongTap为true)，发送结束事件取消显示辅助线
    this._emit('end', e)
  }

  _move (e) {
    // console.log('move');
    e.touches = []
    e.touches.push(e) // 仿写touchmove事件

    if (this.mouseIsPress) {
      this.isLongTap = false
      if ((this.movetouch.x) || (this.movetouch.y)) {
        let deltaX = ~~(e.pageX - (this.movetouch.x || 0))
        let deltaY = ~~(e.pageY - (this.movetouch.y || 0))
        if (ABS(deltaX) < ABS(deltaY)) {
          if (deltaY < 0) {
            this.params.direction = 'up'
          } else {
            this.params.direction = 'down'
          }
        } else {
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
          this.params.deltaX = e.pageX - this.movetouch.x
        } else {
          this.params.deltaX = 0
        }

        if (this.params.deltaX !== 0) {
          this._cancelTouchEnd()
        }
        this._emit('move', e)
      }
    }
    // 更新移动中的手指参数
    this.movetouch.x = e.pageX
    this.movetouch.y = e.pageY

    if (this.mouseIsPress) {
      return // 按压状态下只进入move逻辑
    }

    this.isLongTap = true
    this._emit('longTap', e)

    this._cancelTouchEnd()
    this.touchEndTimeout = window.setTimeout(() => {
      this._emit('end', e)
      this._init()
    }, 1500)
  }

  _end (e) {
    // console.log('end');
    e.touches = []
    e.touches.push(e) // 仿写touchup事件

    let shouldTap = false // 是否应该触发单击事件tap
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

    this.handleTouchEnd(e)
    if (shouldTap) {
      this._emit('tap', e)
    }
  }
  _pinch (e) {
    this._emit('end', e)
    e.preventDefault()

    if (this.support === 'mousewheel') {
      // 非火狐 event.wheelDelta(下-120上120) 正数:向上滚动，负数：向下滚动
      if (e.wheelDelta < 0) {
        // 向下滚动
        this.params.zoom = 1.001
      } else {
        this.params.zoom = 0.999
      }
    } else if (this.support === 'DOMMouseScroll') {
      // 火狐下event.detail(下3上-3) 正数：向下滚动，负数：向上滚动
      if (e.detail > 0) {
        this.params.zoom = 1.001
      } else {
        this.params.zoom = 0.999
      }
    }
    this._emit('pinch', e)
  }
  /**
   * 触发mouseleave事件
   * @param {Event} e mouseleave事件对象
   */
  _leave (e) {
    e.touches = []
    e.touches.push(e) // 仿写touchup事件
    this.handleTouchEnd(e)
  }
  addMouseWheelEvent () {
    if (typeof this.target.onmousewheel === 'object') {
      this.support = 'mousewheel'
      this.target.addEventListener('mousewheel', this._pinch, false)
    } else if (typeof this.target.onmousewheel === 'undefined') {
      this.support = 'DOMMouseScroll'
      this.target.addEventListener('DOMMouseScroll', this._pinch, false)
    } else {
      this.support = ''
      console.warn('不支持鼠标滚轮事件')
    }
  }
  removeMouseWheelEvent () {
    if (this.support === 'mousewheel') {
      this.target.removeEventListener('mousewheel', this._pinch)
    } else if (this.support === 'DOMMouseScroll') {
      this.target.removeEventListener('DOMMouseScroll', this._pinch)
    }
    this.support = ''
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

  handleTouchEnd (e) {
    this._emit('end', e)
    this._init()
  }

  /**
   * 取消所有的定时器
   */
  cancelAll () {
    this._cancelLongTap()
    this._cancelTouchEnd()
  }

  destroy () {
    this.cancelAll()
    this.target.removeEventListener('mousedown', this._start)
    this.target.removeEventListener('mousemove', this._move)
    this.target.removeEventListener('mouseup', this._end)
    this.target.removeEventListener('mouseleave', this._leave)
    this.removeMouseWheelEvent()
    this.isLongTap = false
    this.mouseIsPress = false
    this.params = this.handles = this.movetouch = this.touch = this.preVector = null
    return false
  }
}
