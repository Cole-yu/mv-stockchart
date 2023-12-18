const EPSILON = 0.00000001

/**
 * 去代码前缀 SH600000 转为 600000
 * @param {any} obj
 * @returns
 */
const formatStockCode = function formatStockCode (obj) {
  return obj.substring(2)
}
/**
 * 格式化文本，将输入的数字参数格式化为指定精度的字符串
 * @param {!number|string|null} data      需要格式化的数字，可以是数字，字符串或者null对象
 * @param {?number} precision             保留小数精度，null则默认取2位小数
 * @param {?''|'K'|'M'|'B'|'K/M'|'K/M/B'|'万'|'亿'|'万/亿'|'%'} unit    单位，按自定的单位格式化数据，null则为''为不加单位
 * @param {boolean|string=} useDefault    是否使用默认值，默认显示--，字符串类型表示需要显示的默认值
 * @param {boolean=} isAutoPrec    是否自动进行精度控制，true时 对于不到单位转换的情况时直接取整
 * @param {boolean=} isAbs    是否显示数字绝对值
 * @returns {string}
 */
const formatStockText = function formatStockText (
  data,
  precision,
  unit,
  useDefault,
  isAutoPrec,
  isAbs
) {
  let n = Number(data)
  if (
    (data == null || isNaN(n) || n === Infinity || n === -Infinity) &&
    useDefault !== false
  ) {
    return typeof useDefault === 'string' ? useDefault : '--'
  }

  const abs = Math.abs(n)
  const m = n

  unit = unit || ''
  precision = precision != null ? precision : 2
  if (unit) {
    if (unit.indexOf('B') >= 0 && abs >= 1000000000) {
      unit = 'B'
      n /= 1000000000
    } else if (unit.indexOf('万亿') >= 0 && abs >= 1000000000000) {
      unit = '万亿'
      n /= 1000000000000
    } else if (unit.indexOf('亿') >= 0 && abs >= 100000000) {
      unit = '亿'
      n /= 100000000
    } else if (unit.indexOf('M') >= 0 && abs >= 1000000) {
      unit = 'M'
      n /= 1000 * 1000
    } else if (unit.indexOf('万') >= 0 && abs >= 10000) {
      unit = '万'
      n /= 10000
    } else if (unit.indexOf('K') >= 0 && abs >= 1000) {
      unit = 'K'
      n /= 1000
    } else if (unit === 100) {
      unit = ''
      n /= 100
    } else if (unit === '%') {
      n *= 100
    } else {
      unit = ''
    }
  }

  if (n === m && isAutoPrec === true) {
    precision = 0
  }
  if (isAbs) {
    n = Math.abs(n)
  }

  return (n + EPSILON).toFixed(precision) + unit
}

/**
 * 格式化价格
 * @param {any} price 价格
 * @param {number} [precision=2]  精度
 * @param {boolean} [withSign=false]  是否带正负号
 * @returns
 */
const formatPrice = function formatPrice (
  price,
  precision = 2,
  withSign = false
) {
  // 与服务端约定 停牌的股票的价格返回null 若返回0值，则作为正常值处理
  if (withSign && price >= 0) {
    return '+' + formatStockText(price, precision)
  }
  return formatStockText(price, precision)
}

/**
 * 格式化量值
 * @param {any} volume  量
 * @param {any} unit  量单位
 * @param {number} [precision=2] 精度
 * @returns
 */
const formatVolume = function formatVolume (volume, unit = 100, precision = 2) {
  if (!unit) unit = 1
  if (volume != null) {
    volume = volume / unit // 排除null运算后结果为0的情况
  }
  return formatStockText(volume, precision, '万亿', true, true)
}

/**
 * 获取百分比值
 * @param {any} value 值
 * @param {number} [precision=2] 精度
 * @param {boolean} [withSign=true]  是否带正负号
 * @param {number} [ratio=100] 转化比，默认百分比
 * @returns
 */
const formatRatio = function formatRatio (
  value,
  precision = 2,
  withSign = true,
  ratio = 100
) {
  if (!ratio) ratio = 1
  if (value != null) {
    value = value / ratio// 排除null运算后结果为0的情况
  }
  if (withSign && value > 0) {
    return '+' + formatStockText(value, precision, '%')
  }
  return formatStockText(value, precision, '%')
}

/**
 * 值转化到对应的颜色
 * @param {any} value 要格式化的值
 * @param {number} [compareValue=0]  比较的基准值
 * @param {string} [style=['', 'stock-up', 'stock-down']] 显示的样式
 * @returns
 */
const formatColor = function formatColor (
  value,
  compareValue = 0,
  style = ['', 'stock-up', 'stock-down']
) {
  if (!style || style.length <= 2) {
    return ''
  }

  if (typeof value === 'undefined' || value === null || isNaN(value)) return style[0]
  if (value > compareValue) return style[1]
  else if (value < compareValue) return style[2]
  return style[0]
}

/** 股票类型格式化函数 */
// INDEX = 0,               //指数
// STOCK = 1,               //股票
// FUND = 2,                //基金
// BOND = 3,                //债券
// OTHER_STOCK = 4,         //其它股票
// OPTION = 5,              //选择权
// EXCHANGE = 6,            //外汇
// FUTURE = 7,              //期货
// FTR_IDX = 8,             //期指
// RGZ = 9,                 //认购证
// ETF = 10,                //ETF
// LOF = 11,                //LOF
// COV_BOND = 12,           //可转债
// TRUST = 13,              //信托
// WARRANT = 14,            //权证
// REPO = 15,               //回购
// COMM = 16,               //商品现货
// STOCKFUND = 17,          //股票基金
// BONDFUND = 18,           //债券基金
// HYBRIDFUND = 19,         //混合型基金
// CPTPSVFUND = 20,         //保本型基金
// MONEYFUND = 21,          //货币一般基金
// NVMONEYFUND = 22,        //货币净值基金
// SMFUND = 23,             //短期理财基金
// QDIIFUND = 24,           //QDII基金
// LOANLEND =25,            //拆借
// INTERESTRATE=26,         //利率
// FENJIAFUND=27,           //分级A基金
// FENJIBFUND=28,           //分级B基金
// FENJIMUFUND=29,          //分级母基金
const getStockType = function getStockType (value) {
  let type = ''
  switch (value) {
    case 0:
      type = '指数'
      break
    case 1:
      type = '股票'
      break
    case 2:
      type = '基金'
      break
    case 3:
      type = '债券'
      break
    case 4:
      type = '其它股票'
      break
    case 5:
      type = '选择权'
      break
    case 6:
      type = '外汇'
      break
    case 7:
      type = '期货'
      break
    case 8:
      type = '期指'
      break
    case 9:
      type = '认购证'
      break
    case 10:
      type = 'ETF'
      break
    case 11:
      type = 'LOF'
      break
    case 12:
      type = '可转债'
      break
    case 13:
      type = '信托'
      break
    case 14:
      type = '权证'
      break
    case 15:
      type = '回购'
      break
    case 16:
      type = '商品现货'
      break
    case 17:
      type = '股票基金'
      break
    case 18:
      type = '债券基金'
      break
    case 19:
      type = '混合型基金'
      break
    case 20:
      type = '保本型基金'
      break
    case 21:
      type = '货币一般基金'
      break
    case 22:
      type = '货币净值基金'
      break
    case 23:
      type = '短期理财基金'
      break
    case 24:
      type = 'QDII基金'
      break
    case 25:
      type = '拆借'
      break
    case 26:
      type = '利率'
      break
    case 27:
      type = '分级A基金'
      break
    case 28:
      type = '分级B基金'
      break
    case 29:
      type = '分级母基金'
      break
  }
  return type
}

function formatDate (time, format) {
  const date = new Date(time)
  const o = {
    'M+': date.getMonth() + 1,
    'd+': date.getDate(),
    'h+': date.getHours(),
    'm+': date.getMinutes(),
    's+': date.getSeconds(),
    'q+': Math.floor((date.getMonth() + 3) / 3),
    S: date.getMilliseconds()
  }
  let d
  if (/(y+)/.test(format)) {
    format = format.replace(
      RegExp.$1,
      `${date.getFullYear()}`.substr(4 - RegExp.$1.length)
    )
  }
  Object.keys(o).forEach(k => {
    d = o[k]
    if (new RegExp(`(${k})`).test(format)) {
      format = format.replace(
        RegExp.$1,
        RegExp.$1.length === 1 ? d : `00${d}`.substr(JSON.stringify(d).length)
      )
    }
  })
  return format
}
/**
 * 防抖动：
 * 防抖技术即是可以把多个顺序地调用合并成一次，也就是在一定时间内，规定事件被触发的次数。
 * @param {Function} func 要执行的函数
 * @param {Number} wait 等待时间
 * @param {Boolean} immediate 是否立即执行一次
 */
export function debounce (func, wait, immediate) {
  let timeout
  return function () {
    let context = this
    let args = arguments
    let later = function () {
      timeout = null
      if (!immediate) {
        func.apply(context, args)
      }
    }
    let callNow = immediate && !timeout
    window.clearTimeout(timeout)
    timeout = window.setTimeout(later, wait)
    if (callNow) {
      func.apply(context, args)
    }
  }
}
/**
 * 节流函数：
 * 只允许一个函数在 wait 毫秒内执行一次，只有当上一次函数执行后过了你规定的时间间隔，才能进行下一次该函数的调用。
 * 它保证在 mustRun 毫秒内至少执行一次我们希望触发的事件 func。
 * @param {Function} func 要执行的函数
 * @param {Number} wait 等待多少ms后可以再次执行函数
 * @param {Number} mustRun 多少ms内至少执行一次，mustRun > wait
 */
export function throttle (func, wait, mustRun) {
  let timeout
  let startTime = new Date()
  return function () {
    let context = this
    let args = arguments
    let curTime = new Date()
    window.clearTimeout(timeout)
    if (curTime - startTime >= mustRun) {
      // 如果达到了规定的触发时间间隔，触发 事件
      func.apply(context, args)
      startTime = curTime
    } else {
      // 没达到触发间隔，重新设定定时器
      timeout = window.setTimeout(func, wait)
    }
  }
}
export default {
  formatStockCode,
  formatStockText,
  formatPrice,
  formatVolume,
  formatRatio,
  formatColor,
  getStockType,
  formatDate,
  debounce,
  throttle
}
