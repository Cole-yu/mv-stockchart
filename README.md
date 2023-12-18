# mv-stockchart

绘制分时图和日K、周K、月K 图表
>**注意：**此组件依赖于dzhyunjs获取数据，必须实现配置好vue插件

#### props
| 属性 | 说明 | 类型 | 默认值 |
| :------: | :----: | :----: | :--: |
| obj | 股票代码，必须 | String | 无 |
| chartType | 图表类型：min(分时图)，1day(日K)，week(周K)，month(月K) | String | min |
| days | 多日分时：最大为10，值为5时表示取4天的历史分时加当天的分时 | Number | 无 |
| pricePrecision | 价格小数位数 | Number | 2 |
| volPrecision | 数量(量图) 小数位数 | 0 |
| longTapTime | 当一个元素被按住超过 longTapTime 毫秒触发长按事件 | Number | 750 |
| huilv | 汇率 | Number | 1 |
| hasAvgPrice | 是否有均价 | Boolean | true |
| customInterval | 分时图时间段间隔，默认一小时 | Number | 60 |
| doubleTapTime | 连续两次点击之间的间隔相差x毫秒，则触发双击事件，默认0，即不触发双击事件 | Number | 0 |
| upColor | 股票上升时的颜色 | String | '#ff0000' |
| downColor | 股价下跌时的颜色 | String | '#008000' |
| pointerLineColor | 按压时辅助线的颜色 | String | '#999999' |
| gridLineColor | 坐标轴颜色 | String | '#dddddd' |
| tickColor | 坐标轴 文字颜色 | String | '#555555' |
| tickBackgroundColor | 文字背景颜色 | String | '#eeeeee' |
| avgPriceColor | 均线的颜色 | String | '#EB5F15' |
| maColor | ma线的颜色,一个数组, MA5, MA10, MA30, MA60 | Array | ['#FFD11E', '#F77BFC', '#39C2FD', '#B7B7B7'] |
| bollColor | BOLL 线的颜色 | Array | ['#FFD11E', '#F77BFC', '#39C2FD'] |
| macdColor | DIFF和DEA 线的颜色 | Array | ['#FFD11E', '#F77BFC'] |
| kdjColor | KDJ线的颜色 | Array | ['#FFD11E', '#F77BFC', '#39C2FD'] |
| rsiColor | RSI线的颜色 | Array | ['#FFD11E', '#F77BFC', '#39C2FD'] |
| dmaColor | DMA线的颜色 | Array | ['#FFD11E', '#F77BFC'] |
| volTradeUnit | 成交量的交易单位，例如 100股为1手 ChengJiaoLiang要除以 100 | Number | 100 |
| split | K线的除权标记，0(不复权),1(前复权),2(后复权) | Number | 1 |
| isMobileMode | 是否是手机端，手机端用触摸事件，pc端用鼠标事件 | Boolean | true |
| useEvent | 是否支持鼠标或触摸事件 | Boolean | true |
| showPrefix | 分时图是否显示集合竞价阶段 | Boolean | true |
| horizLineCount | 水平线数量（分时图中必须是偶数） | Number | 4 |
| klineIndics | k线图的指标, 'NONE', 'VOL', 'MACD', 'KDJ', 'RSI', 'DMA' | String | 'VOL' |
| klineMainIndics | k线图的主图指标, 'NONE', 'MA', 'BOLL' | String | 'VOL' |
| leftRangeWidth | 左侧坐标区域宽度 | Number | 0 |
| rightRangeWidth | 右侧坐标区域宽度 | Number | 0 |
| initKlineCount | 初始K线数量，最少20 | Number | 80 |
| chartExtend | 扩展图形绘制 | Object | null |

#### events
| 事件名 | 说明 | 返回值 |
| :--: | :--: | :--: |
| long-tap-select | 长按选中，会发送此事件 | 长按选中的的数据 |
| touchend | 手指触摸结束后发送此事件 | 无 |
| tap | 单击触发 | 无 |

#### methods
| 方法名 | 说明 | 参数 |
| :--: | :--: | :--: |
| loadChart | 组件mounted主动调用，开始绘图 | 无 |
