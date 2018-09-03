// pages/invite/invite.js
const Url = require('../../utils/server.js').url;
const showSetting = require('../../utils/setting.js').showSetting;
const app = getApp();

Page({
  /**
   * 页面的初始数据
   */
  data: {
    showCode: '',
    money: null
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    const code = options.code;
    const money = options.money;
    if (code) {
      this.setData({
        showCode: code
      })

      this.hideShare();
    } else {
      const userid = app.globalData.userid;
      //表明是自己的分享页 通过userId获取code
      if (userid) {
        this.getMyInviteCode(userid);
      } else {
        this.setData({
          showCode: '暂未登录'
        })
        this.hideShare();
        app.userIdReadyCallback = uid => {
          this.getMyInviteCode(uid);
          if (wx.showShareMenu) {
            wx.showShareMenu()
          }
        }
      }
    }

    if (money) {
      this.setData({
        money: money
      })
    }
  },

  getMyInviteCode: function (uid) {
    wx.request({
      url: Url + '/User/GetUserInfo',
      data: {
        userId: uid,
        aes: false
      },
      success: (res) => {
        const Data = res.data;
        if (Data.errorcode == '00000:ok') {
          this.setData({
            showCode: Data.result[0].invitationCode
          });
        }
      }
    });
  },

  hideShare: function () {
    if (wx.hideShareMenu) {
      wx.hideShareMenu()
    }
  },

  toGetMoney: function () {
    if (app.globalData.userid) {
      wx.switchTab({
        url: '/pages/index/index'
      })
    } else {
      showSetting();
    }
  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function () {
    const Data = this.data;
    return {
      title: '微电影',
      path: '/pages/invite/invite' + (Data.showCode && Data.showCode != '暂未登录' ? '?code=' + Data.showCode + (Data.money ? '&code=' + Data.money : '') : '')
    }
  }
})