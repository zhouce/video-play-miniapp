// pages/my/my.js
const Url = require('../../utils/server.js').url;
const showSetting = require('../../utils/setting.js').showSetting;
const navigateTo = require('../../utils/jump.js').navigateTo;

const app = getApp();

Page({

  /**
   * 页面的初始数据
   */
  data: {
    canIUse: wx.canIUse('button.open-type.contact'),
    getting: false,
    userInfo: {}
  },

  customData: {
    uidx: 0
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    if (app.globalData.userid) {
      this.customData.uidx = app.globalData.userid;
      this.getUserInfo();
    } else {
      app.userIdReadyCallback = uid => {
        this.customData.uidx = uid;
        this.getUserInfo();
      }
    }
  },

  getUserInfo: function (callback) {
    this.setData({
      getting: true
    });
    wx.request({
      url: Url + '/User/GetUserInfo',
      data: {
        userId: this.customData.uidx,
        aes: false
      },
      success: (res) => {
        if (res.data.errorcode == '00000:ok') {
          this.setData({
            getting: false,
            userInfo: res.data.result[0]
          });
        } else {
          this.setData({
            getting: false
          });
        }
        if (callback) {
          callback();
        }
      },
      fail: () => {
        this.setData({
          getting: false
        });
        if (callback) {
          callback();
        }
      }
    });
  },

  loginBtnClick: function () {
    if (this.customData.uidx) {
      this.getUserInfo();
    } else {
      showSetting();
    }
  },

  toLikes: function () {//跳转到我喜欢的
    if (this.customData.uidx) {
      navigateTo('/pages/likes/likes');
    } else {
      showSetting();
    }
  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh: function () {
    if (!this.customData.uidx) {
      wx.stopPullDownRefresh();
    } else {
      this.getUserInfo(() => {
        wx.stopPullDownRefresh();
      });
    }
  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function () {

  }
})