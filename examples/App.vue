<template>
  <div id="app">
    <router-view/>
  </div>
</template>
<style lang="less">
html, body, #app {
  margin: 0;
  padding: 0;
  height: 100%;
  width: 100%;
}
.clearfix:before,
.clearfix:after {
  content: " ";
  display: table;
}

.clearfix:after {
  clear: both;
}
.detail-page-wrap {
  width: 100%;
  height: 100%;
  user-select: none;
  overflow-x: hidden;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;

  .stock-chart-wrap {
    box-sizing: content-box;
    // width: 90vw;
    width: 100%;
    height: 70vh;
    text-align: center;
    overflow: hidden;
    margin: 0.2rem auto 0;
  }
}
</style>
