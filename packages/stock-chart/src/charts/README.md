## 使用简介
以vue项目+dzhyunjs为例
1. 初始化DataProvider并提供股票代码和dzhyunjs
```javascript
this.chartDataProvider = new DataProvider({ obj: 'xxx' }, this.$dzhyun);
```
2. 初始化Canvas
```javascript
this.canvas = new Canvas({
    pixelRadio: 2, // 移动端像素比
    canvasId: 'canvas', // canvas标签的id
    width: 375, // 画布宽
    height: 420 // 画布高
});
```

3. 初始化想要绘制的图表类型，以分时图为例，给其提供上面创建好的chartDataProvider
```javascript
let currentChart = new MinChart(this.chartDataProvider);
```
4. 绘制图表
```javascript
this.canvas.show(currentChart);
```

### DataProvider类
构造器有2个参数：
1. params查询参数，参考行情接口
```javascript
{
	obj: '***' 股票代码
}
```
2. dzhyunjs实例

###Canvas类
构造器有1个参数：
```javascript
{
	pixelRadio： Number类型，移动端屏幕像素比，默认值 2
	canvasId： String类型，canvas标签的id，必填项
	width： Number类型，画布宽，默认值 375
	height： Number类型，画布高，默认值 500
}
```

###Chart类
构造器有2个参数：
1. DataProvider实例
2. options配置项
```javascript
{
	fontSize：Number类型，字体大小，默认 10
	upColor： 上涨 颜色，默认 '#ff0000'
	downColor： 下跌 颜色，默认 '#008000'
	longTap：Function函数，暴露出去的长按回调事件，默认是一个空函数
}
```


### 绘图的步骤：以绘制分时图MinChart.js为例

1.  this.chartDataProvider = new DataProvider({ obj: this.data.obj });
    给 DataProvider(数据提供者) 提供股票账号
2.  currentChart = this.minChart = this.minChart || new MinChart(this.chartDataProvider);
    初始化一种图表类型，把DataProvider(数据提供者)作为其参数
3.  this.canvas.show(currentChart);
    展示图表(画图)
4.  Canvas.js 内 show(chart)
5.  Canvas.js 内 chart.setCanvas(this)把canvas设置为Chart内私有变量，并initData()
    特别注意：此时setCanvas()方法是MinChart.js继承自Chart.js的方法，所以setCanvas()内this.initData()是MinChart.js内的initData()。
6.  MinChart.js会先调用父类的initData(),然后订阅数据this.dataProvider.subscribeMin()
    并在每次收到新数据后重绘图表this.redraw();
7.  Canvas.js 内 show(chart) --> redraw()
8.  调用Chart的redraw()
    currentChart && currentChart.redraw()
9.  MinChart.js的redraw()调用父类的redraw()，由此重绘图表

图表的数据格式 = MinChart.js内私有变量this.cache = DataProvider.js内this.minCache
```javascript
{
    lastClose: xxx, // 昨收
    minTimes: [
        1523927700*1000, // 以毫秒为单位
        1523927760*1000,
        1523927820*1000,
        **
    ], // 从交易日 开始时间到结束时间的时间节点数组，以毫秒为单位，每次间隔1分钟
    1523927700 * 1000: {
        ChengJiaoE: 0,
        ChengJiaoJia: 3.93,
        ChengJiaoLiang: 0,
        DuoKongXian: 0, // 多空线(指数特有)
        Id: 0,
        JunJia: 3.93,
        LingXianZhiBiao: 0, // 领先指标(指数特有)
        ShiJian: 1523927700,
        WeiTuoMaiChuZongLiang: 0,
        WeiTuoMaiRuZongLiang: 0,
        isUp: true // 成交价是否大于昨收(MinChart.js内drawChart())
    }
    1523927760 * 1000: {**},
    1523927820 * 1000: {**},
    **
}
```
