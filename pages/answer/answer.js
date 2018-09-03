// pages/answer/answer.js
const app = getApp();

Page({

  /**
   * 页面的初始数据
   */
  data: {
    h5url: null
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    if (app.globalData.canUseWebView) {
      const userid = app.globalData.userid;
      if (userid) {
        this.setData({
          h5url: 'https://answer.miaokanvideo.com/?p=mini&u=' + userid + '#wechat_redirect'
        })
      } else {
        app.userIdReadyCallback = uid => {
          this.setData({
            h5url: 'https://answer.miaokanvideo.com/?p=mini&u=' + uid + '#wechat_redirect'
          })
        }
      }
    } else {
      setTimeout(() => {
        wx.switchTab({
          url: '/pages/index/index'
        })
      }, 500);
    }
  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function () {
  
  }
})