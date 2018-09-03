//app.js
var aldstat = require("./utils/ald-stat.js");//接入阿拉丁小程序统计
const url = require('./utils/server.js').url;
const uploadurl = require('./utils/server.js').uploadurl;
const version = require('./utils/server.js').version;
const videoFull = require('./utils/videoFull.js');

App({
  onLaunch: function () {
    if (this.globalData.videoControl) {
      videoFull.AccelerometerChange();
      videoFull.AccelerometerStop();
    }

    if (wx.canIUse('getSystemInfo.success.brand')) {
      wx.getSystemInfo({
        success: res => {
          this.globalData.Brand = res.brand;
        }
      });
    }
  },
  onShow: function (options) {
    if (!this.globalData.userid) {
      try {
        var uid = wx.getStorageSync('userid');
        if (uid) {
          this.setGlobalUid(uid);
        } else {
          this.doLogin(options.path);
        }
      } catch (e) {
        this.doLogin();
      }
    } else {
      const timer = this.globalData.closeTimer;
      if (timer == false) {
        this.updateUserInfo(this.globalData.userid);
      }
      timer && clearTimeout(timer);
    }
  },
  onHide: function () {
    if (this.globalData.userid) {
      this.globalData.closeTimer && clearTimeout(this.globalData.closeTimer);
      this.globalData.closeTimer = setTimeout(() => {
        this.closeUserLogin();
        this.globalData.closeTimer = false;
      }, 30000);
    }
  },
  setGlobalUid: function (uid) {
    this.globalData.userid = uid;
    if (this.userIdReadyCallback) {
      this.userIdReadyCallback(uid);
    }

    this.updateUserInfo(uid);
  },
  updateUserInfo: function (uid) {
    const brand = this.globalData.Brand;
    wx.request({
      url: url + '/User/OpenAppAndUpdateUserInfo?aes=false',
      method: 'POST',
      data: {
        userId: uid,
        uniques: '',
        useAppVersion: version,
        phoneBrand: brand ? brand : ''
      }
    });
  },
  closeUserLogin: function () {
    wx.request({
      url: url + '/User/CloseAppAndUpdateUserInfo?aes=false',
      method: 'POST',
      data: {
        userId: this.globalData.userid
      }
    });
  },
  globalData: {
    userid: null,
    closeTimer: null,
    Brand: null,
    canUseWebView: wx.canIUse('web-view'),
    videoControl: wx.canIUse('video.bindfullscreenchange')
  },
  doLogin: function (pathNow) {
    wx.login({
      success: res => {
        wx.getUserInfo({
          withCredentials: true,
          success: res2 => {
            wx.request({
              url: uploadurl + '/User/WeChatLoginForMiniApps?aes=false',
              method: 'POST',
              data: {
                code: res.code,
                encryptedData: res2.encryptedData,
                iv: res2.iv
              },
              success: (res3) => {
                if (res3.data.errorcode == '00000:ok') {
                  const userid = res3.data.result[0].userid;
                  this.setGlobalUid(userid);
                  wx.setStorage({
                    key: 'userid',
                    data: userid
                  })
                }
              }
            });
          },
          fail: () => {
            //webview需要返回首页
            if (pathNow == 'pages/answer/answer') {
              setTimeout(() => {
                wx.switchTab({
                  url: '/pages/index/index'
                })
              }, 500);
            }
          }
        })
      }
    })
  }
})