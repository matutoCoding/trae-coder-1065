export default defineAppConfig({
  pages: [
    'pages/booking/index',
    'pages/mybookings/index',
    'pages/queue/index',
    'pages/mine/index',
    'pages/detail/index',
    'pages/coach/index',
    'pages/vip/index'
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#22c55e',
    navigationBarTitleText: '网球中心预约',
    navigationBarTextStyle: 'white'
  },
  tabBar: {
    color: '#86909c',
    selectedColor: '#22c55e',
    backgroundColor: '#ffffff',
    borderStyle: 'black',
    list: [
      {
        pagePath: 'pages/booking/index',
        text: '场地预约'
      },
      {
        pagePath: 'pages/queue/index',
        text: '排队叫号'
      },
      {
        pagePath: 'pages/mybookings/index',
        text: '我的预约'
      },
      {
        pagePath: 'pages/mine/index',
        text: '我的'
      }
    ]
  }
})
