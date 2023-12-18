import stockUtils from '../utils/stockUtils'

function noop () {}
const oneMinute = 1 * 60 * 1000
const oneDay = 1 * 24 * 60 * oneMinute
const baseIndicators = ['MA', 'BOLL', 'MACD', 'KDJ', 'RSI', 'DMA', 'BIAS', 'CCI', 'W&R']
// 默认股票交易时间
const defaultTimeInfo = (function () {
  const now = new Date()
  const year = now.getFullYear()
  const month = `0${now.getMonth() + 1}`.slice(-2)
  const day = `0${now.getDate()}`.slice(-2)
  const date = [year, month, day].join('')
  return {
    RiQi: date,
    JiaoYiShiJianDuan: [{
      KaiShiShiJian: 930,
      JieShuShiJian: 1130,
      KaiShiRiQi: date,
      JieShuRiQi: date
    },
    {
      KaiShiShiJian: 1300,
      JieShuShiJian: 1500,
      KaiShiRiQi: date,
      JieShuRiQi: date
    }
    ],
    JiHeJingJiaDianShu: 15,
    ShiQu: 8,
    ZuoShou: 0
  }
})()
/**
 * 解析日期、时间、时区，返回Date.UTC(2018,3,17,9,30)
 * 注意：Date.UTC()的month是0到11之间的整数
 * @param {String || Number} dateParam 日期，格式为20180417
 * @param {String || Number} hourMinute 时间，格式为930或者1130
 * @param {Number} timeZone 时区，默认为 8
 * @returns 返回从1970-1-1 00:00:00 UTC到指定日期(例2018-04-17 09:30)的毫秒数
 */
const getTime = function (dateParam, hourMinute, timeZone) {
  const date = String(dateParam)
  const year = parseInt(date.substr(0, 4), 10)
  const month = parseInt(date.substr(4, 2), 10) - 1
  const day = parseInt(date.substr(6, 2), 10)
  const hour = parseInt(Number(hourMinute) / 100, 10) - timeZone
  const minute = hourMinute % 100
  return Date.UTC(year, month, day, hour, minute)
}

export default class DataProvider {
  constructor (params, dzhyun, huilv, volTradeUnit, showPrefix) {
    this.dzhyun = dzhyun // dzhyunjs实例
    this.huilv = huilv // 汇率
    this.showPrefix = showPrefix // 是否显示集合竞价
    this.volTradeUnit = volTradeUnit // 成交量的交易单位
    // params为{obj: 'xxx'}
    this.params = params
  }

  getKline (params) {
    const klineQuery = this.dzhyun
      .query('/quote/kline', Object.assign({}, this.params, params))
      .then(data => {
        // console.log('getKline', data);
        if (data[0] && data[0].Data) {
          let list = data[0].Data
          list.forEach((item) => {
            item.KaiPanJia = item.KaiPanJia * this.huilv
            item.ShouPanJia = item.ShouPanJia * this.huilv
            item.ZuiDiJia = item.ZuiDiJia * this.huilv
            item.ZuiGaoJia = item.ZuiGaoJia * this.huilv
            item.ChengJiaoLiang = item.ChengJiaoLiang / this.volTradeUnit
            if (item.lastClose) {
              item.lastClose = item.lastClose * this.huilv
            }
          })
          return list
        }
        return []
      })
    return klineQuery
  }

  subscribeKline (params, callback = noop) {
    // 每次订阅前线取消其它的订阅
    this.cancel()
    this.klineDataStore = this.dzhyun.subscribe(
      '/quote/kline',
      Object.assign({}, this.params, params),
      data => {
        if (!(data instanceof Error)) {
          let kline = data[0] && data[0].Data
          if (kline) {
            // console.log('DataProvider.js-->subscribeKline', JSON.parse(JSON.stringify(data)));
            kline.forEach((item) => {
              item.KaiPanJia = item.KaiPanJia * this.huilv
              item.ShouPanJia = item.ShouPanJia * this.huilv
              item.ZuiDiJia = item.ZuiDiJia * this.huilv
              item.ZuiGaoJia = item.ZuiGaoJia * this.huilv
              item.ChengJiaoLiang = item.ChengJiaoLiang / this.volTradeUnit
              if (item.lastClose) {
                item.lastClose = item.lastClose * this.huilv
              }
            })
            callback(kline)
          }
        }
      }
    )
  }

  getMA (params) {
    return this.dzhyun
      .query(
        '/indicator/calc',
        Object.assign({}, this.params, params, {
          name: 'MA',
          text: 'MA1:MA(CLOSE,P1);MA2:MA(CLOSE,P2);MA3:MA(CLOSE,P3);MA4:MA(CLOSE,P4);',
          parameter: 'P1=5,P2=10,P3=30,P4=60'
        })
      )
      .then(data => {
        if (data[0] && data[0].ShuJu) {
          let list = data[0].ShuJu
          for (let i = 0, j = list.length; i < j; i++) {
            let jieguo = list[i].JieGuo
            jieguo.forEach((item, index) => {
              jieguo[index] = item * this.huilv
            })
          }
          return list
        }
        return []
      })
      .catch(() => [])
  }

  getIndicatorData (params) {
    let queryPath = '/indicator/calc'
    if (baseIndicators.indexOf(params.name) === -1) { // 判断是否是基础指标
      queryPath = '/indicator/calc/new'
    }
    return this.dzhyun.query(queryPath, Object.assign({}, this.params, params)).then(data => {
      if (data[0] && data[0].ShuJu) {
        return data[0].ShuJu
      }
      return []
    }).catch(() => [])
  }

  /**
   * 初始化minCache，给minCache添加交易时间段minTimes
   * @param {Object} timeInfo
   */
  _initMinCache (timeInfo) {
    const times = timeInfo.JiaoYiShiJianDuan
    const timeZone = timeInfo.ShiQu || 8
    this.minCache = {
      lastClose: timeInfo.ZuoShou,
      ZuoShou: timeInfo.ZuoShou, // 用来缓存初始状态时的 昨收价，因为汇率变化时要重新计算
      ShiQu: timeZone
    }
    let minTimes = []
    if (times && times.length > 0) {
      // 统计当日的数据
      minTimes = this.calMinTimes(times, timeZone, timeInfo.JiHeJingJiaDianShu || 0)
    }
    this.minCache.minTimes = minTimes
  }

  /**
   * 订阅当日分时
   * @param {Function} callback 回调函数
   */
  subscribeMin (callback = noop) {
    // 每次订阅前线取消其它的订阅
    this.cancel()
    let queryParams = Object.assign({}, this.params)
    if (this.minCache && this.minCache.currentTime) {
      let beginTime = stockUtils.formatDate(this.minCache.currentTime * 1000, `yyyyMMdd-hhmmss`) + `-000-${this.minCache.ShiQu}`
      queryParams.begin_time = beginTime
    }
    this.minDataStore = this.dzhyun.subscribe(
      '/quote/min',
      queryParams,
      data => {
        if (data && !(data instanceof Error) && data.length > 0) {
          let minData = data[0]

          // 清盘
          if (minData.QingPan === 1) {
            this.minCache = null
          }

          // 初始缓存数据(交易时间段)
          if (!this.minCache) {
            // console.log('subscribeMin-->data', JSON.parse(JSON.stringify(data)))
            this._initMinCache(
              minData.JiaoYiShiJianDuan ? minData : defaultTimeInfo
              // defaultTimeInfo
            )
          }
          if (this.minCache && this.minCache.ZuoShou) {
            this.minCache.lastClose = this.minCache.ZuoShou * this.huilv
          }

          // 更新数据
          minData = minData.Data
          if (minData && minData.length > 0) {
            minData.forEach(eachData => {
              const time = eachData.ShiJian * 1000
              const newPrice = eachData.ChengJiaoJia * this.huilv
              this.updateMinCache(this.minCache, this.minCache.minTimes, time, eachData, newPrice)
            })
            // 记录最后一条数据的时间(以秒为单位)，下次订阅从此时间开始
            const currentTime = minData[minData.length - 1].ShiJian
            if (currentTime) {
              this.minCache.currentTime = currentTime
            }
          }
          // console.log('subscribeMin-->this.minCache', JSON.parse(JSON.stringify(this.minCache)));
          callback(this.minCache)
        }
      }
    )
  }
  /**
   * 根据交易时间段得出时间段minTimes
   * @param {Array} times JiaoYiShiJianDuan 交易时间段
   * @param {Number} timeZone ShiQu 时区
   * @param {Number} JiHeJingJiaDianShu 集合竞价点数
   */
  calMinTimes (times, timeZone, JiHeJingJiaDianShu = 0) {
    let minTimes = []
    // console.log(`calMinTimes-->times`, JSON.parse(JSON.stringify(times)))
    if (times && times.length > 0) {
      let lastTime = 0
      let startTime
      let endTime
      const len = times.length - 1
      this.minCache.timeIntervalPoints = []
      times.forEach((eachTime, index) => {
        startTime = getTime(
          eachTime.KaiShiRiQi,
          eachTime.KaiShiShiJian,
          timeZone
        )
        endTime = getTime(
          eachTime.JieShuRiQi,
          eachTime.JieShuShiJian,
          timeZone
        )

        // 跨天
        if (endTime < startTime) {
          endTime += oneDay
        }
        if (startTime < lastTime) {
          startTime += oneDay
          endTime += oneDay
        }

        // 跳过除第一段时间的开始时间
        if (index > 0) {
          startTime += oneMinute
        }
        // 给minTimes添加数据，从startTime开始到endTime，每隔1分钟oneMinute添加一次
        while (startTime <= endTime) {
          minTimes.push(startTime)
          startTime += oneMinute
        }
        lastTime = endTime

        // 保存时间间隔点，例如 11:30
        if (index < len) {
          this.minCache.timeIntervalPoints.push(endTime)
        }
      })

      if (this.showPrefix) {
        // 默认包含集合竞价(9:15到9:30之间)的数据
        const prefixMinute = JiHeJingJiaDianShu
        startTime = minTimes[0]
        // 如果有集合竞价，要画(9:15到9:30之间)的数据，所以时间段要多加15分钟
        for (let i = 1; i <= prefixMinute; i += 1) {
          minTimes.unshift(startTime - i * oneMinute)
        }
      }
    }
    return minTimes
  }
  /**
   * 初始化多日分时multiMinCache，添加交易时间段minTimes
   * @param {Object} data 数据
   */
  _initMultiMinCache (data) {
    const times = data.JiaoYiShiJianDuan
    const timeZone = data.ShiQu || 8
    this.multiMinCache = {
      lastClose: data.ZuoShou,
      ZuoShou: data.ZuoShou, // 用来缓存初始状态时的 昨收价，因为汇率变化时要重新计算
      ShiQu: timeZone
    }
    let minTimes = []
    // 统计历史分时的数据
    if (data.LiShiFenShi && data.LiShiFenShi.length > 0) {
      const oldData = data.LiShiFenShi
      let item
      let rows
      for (let i = 0, j = oldData.length; i < j; i++) {
        let itemMinTimes = []
        item = oldData[i]
        rows = item.Rows
        if (item.JiaoYiShiJianDuan) {
          itemMinTimes = this.calMinTimes(item.JiaoYiShiJianDuan, timeZone)
        }
        if (itemMinTimes.length > 0 && rows && rows.length > 0) {
          rows.forEach(eachData => {
            const time = eachData.ShiJian * 1000
            const newPrice = eachData.ChengJiaoJia * this.huilv
            this.updateMinCache(this.multiMinCache, itemMinTimes, time, eachData, newPrice)
          })
        }
        minTimes = minTimes.concat(itemMinTimes)
      }
    }
    // 统计当日的数据
    if (times && times.length > 0) {
      let curMinTimes = this.calMinTimes(times, timeZone, data.JiHeJingJiaDianShu || 0)
      const curData = data.Data
      if (curMinTimes.length > 0 && curData && curData.length > 0) {
        curData.forEach(eachData => {
          const time = eachData.ShiJian * 1000
          const newPrice = eachData.ChengJiaoJia * this.huilv
          this.updateMinCache(this.multiMinCache, curMinTimes, time, eachData, newPrice)
        })
        // 记录最后一条数据的时间(以秒为单位)，下次订阅从此时间开始
        const currentTime = curData[curData.length - 1].ShiJian
        if (currentTime) {
          this.multiMinCache.currentTime = currentTime
        }
      }
      minTimes = minTimes.concat(curMinTimes)
    }
    this.multiMinCache.minTimes = minTimes
  }
  updateMinCache (cache, minTimes, time, data, newPrice) {
    let index = minTimes.indexOf(time)
    data.ChengJiaoJia = newPrice
    data.ChengJiaoLiang = data.ChengJiaoLiang / this.volTradeUnit
    if (index >= 0) {
      cache[time] = data
    } else {
      /**
       * 跨天，后端逻辑错误
       * 交易时间段(JiaoYiShiJianDuan)的结束日期(JieShuRiQi)和结束时间(JieShuShiJian)不匹配
       */
      /* 可能是集合竞价 */
      // console.warn('跨天');
    }
  }
  /**
   * 订阅多日分时
   * @param {Function} callback 回调函数
   * @param {Object} params 查询参数
   */
  subMultiMin (callback = noop, params = {}) {
    // 每次订阅前线取消其它的订阅
    this.cancel()
    let queryParams = Object.assign({}, this.params, params)
    if (this.multiMinCache && this.multiMinCache.currentTime) {
      let beginTime = stockUtils.formatDate(this.multiMinCache.currentTime * 1000, `yyyyMMdd-hhmmss`) + `-000-${this.multiMinCache.ShiQu}`
      queryParams.begin_time = beginTime
    }
    this.multiMinDataStore = this.dzhyun.subscribe(
      '/quote/min',
      queryParams,
      data => {
        // console.log('subMultiMin-->data', JSON.parse(JSON.stringify(data)));
        if (data && !(data instanceof Error) && data.length > 0) {
          let minData = data[0]

          // 清盘
          if (minData.QingPan === 1) {
            this.multiMinCache = null
          }

          // 初始缓存数据
          if (!this.multiMinCache) {
            this._initMultiMinCache(minData.JiaoYiShiJianDuan ? minData : defaultTimeInfo)
          } else {
            // 更新数据
            minData = minData.Data
            if (minData && minData.length > 0) {
              minData.forEach(eachData => {
                const time = eachData.ShiJian * 1000
                const newPrice = eachData.ChengJiaoJia * this.huilv
                this.updateMinCache(this.multiMinCache, this.multiMinCache.minTimes, time, eachData, newPrice)
              })
              // 记录最后一条数据的时间(以秒为单位)，下次订阅从此时间开始
              const currentTime = minData[minData.length - 1].ShiJian
              if (currentTime) {
                this.multiMinCache.currentTime = currentTime
              }
            }
          }
          if (this.multiMinCache && this.multiMinCache.ZuoShou) {
            this.multiMinCache.lastClose = this.multiMinCache.ZuoShou * this.huilv
          }
          // console.log('subMultiMin-->this.multiMinCache', JSON.parse(JSON.stringify(this.multiMinCache)));
          callback(this.multiMinCache)
        }
      }
    )
  }

  cancel () {
    if (this.klineDataStore) {
      this.klineDataStore.cancel()
      this.klineDataStore = null
    }
    if (this.minDataStore) {
      this.minDataStore.cancel()
      this.minDataStore = null
    }
    if (this.multiMinDataStore) {
      this.multiMinDataStore.cancel()
      this.multiMinDataStore = null
    }
  }
}
