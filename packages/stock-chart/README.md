## stock-chart组件
绘制分时图和日K、周K、月K 图表(大行情/stkdata接口)
>**注意：**此组件依赖于dzhyunjs获取数据，必须实现配置好vue插件(例如：dzhyun-vue-data)，即必须有全局this.$dzhyun

#### props
| 属性 | 说明 | 类型 | 默认值 |
| :------: | :----: | :----: | :--: |
| obj | 股票代码，必须 | String | 无 |
| width | 图表的显示宽度，单位px | Number | 375 |
| height | 图表的显示高度，单位px | Number | 420 |
| pixelRadio | 移动端像素比 | Number | 2 |
| chartType | 图表类型：min(分时图)，1day(日K)，week(周K)，month(月K) | String | 'min' |
| longTapTime | 当一个元素被按住超过 longTapTime 毫秒触发长按事件，不建议修改 | Number | 750 |

#### events
| 事件名 | 说明 | 返回值 |
| :--: | :--: | :--: |
| long-tap-select | 长按选中，会发送此事件 | 长按选中的的数据 |
