// pages/index/index.js
const Url = require('../../utils/server.js').url;
const addWatchNum = require('../../utils/server.js').addWatchNum;
const Base64 = require('../../utils/base64.js').Base64;
const showToast = require('../../utils/toast.js').showToast;
const navigateTo = require('../../utils/jump.js').navigateTo;
const showSetting = require('../../utils/setting.js').showSetting;
const videoFull = require('../../utils/videoFull.js');

const app = getApp();

Page({

  /**
   * 页面的初始数据
   */
  data: {
    canIUse: wx.canIUse('button.open-type.share'),
    canSW: wx.canIUse('swiper.next-margin'),
    banners: [],
    videos: [],
    noVideos: false,//视频列表是否加载完
    nowVideo: null,//当前在看的videoId
    nowIndex: 0,
    isHide: false,
    canUseWebView: app.globalData.canUseWebView,
    danmu: []
  },

  customData: {
    danmuTime: 0,//上次获取弹幕的时间
    currentTime: 0,//当前视频播放时间
    loading: true,//是否正在加载视频列表
    nextBegin: 16,//下次加载视频的begin
    uidx: 0,
    stopListen: false,//视频结束或暂停时 停止监听加速器
    isWifi: false,//是否是wifi网
    canUseSelector: !!wx.createSelectorQuery,
    firstVideoH: 0,//第一个视频item的height
    firstVideoT: 0,//第一个视频item的top
    videoPlaying: false,//是否有视频正在播放
    isFullScreen: false//视频是否进入全屏
  },

  swiperChange: function (e) {
    console.log(1);
    this.setData({
      nowIndex: e.detail.current
    })
  },

  loadVideos: function (begin, reload, callback) {
    if (reload) {
      this.pauseOldVideo();
    }
    this.customData.loading = true;
    const num = reload ? 15 : 10;
    wx.request({
      url: Url + '/Work/GetVideoStreaming',
      data: {
        type: 0,
        uidx: this.customData.uidx,
        begin: begin,
        num: num,
        unique: '',
        aes: false
      },
      success: (res) => {
        if (res.data.errorcode == '00000:ok') {
          this.customData.nextBegin = begin + num;
          let newList = [];
          const result = res.data.result;
          for (let i = 0, len = result.length; i < len; i++) {
            const obj = result[i];
            obj.authorHeadPhoto = Base64.decode(obj.authorHeadPhoto);
            obj.videoPicUrl = Base64.decode(obj.videoPicUrl);
            obj.videoUrl = Base64.decode(obj.videoUrl);
            newList.push(obj);
          }
          this.setData({
            videos: reload ? newList : this.data.videos.concat(newList)
          })

          if (callback) {//是通过上拉刷新获取的
            wx.setStorage({
              key: 'lastBegin',
              data: JSON.stringify({
                begin: begin,
                time: new Date().getTime()
              })
            })
          }
        } else if (res.data.errorcode == '10007') {//加载完 无数据了
          if (callback) {
            this.loadVideos(1, true);
            this.removeLastBegin();
          } else {
            this.setData({
              noVideos: true
            });
          }
        }
        this.customData.loading = false;
        if (callback) {
          callback();
        }
      },
      fail: () => {
        this.customData.loading = false;
        if (callback) {
          callback();
        }
      }
    });
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    wx.request({
      url: Url + '/Work/GetBannerInfo',
      data: {
        aes: false
      },
      success: (res) => {
        if (res.data.errorcode == '00000:ok') {
          this.setData({
            banners: res.data.result
          });
        }
      }
    });

    if (app.globalData.userid) {
      this.customData.uidx = app.globalData.userid;
    } else {
      app.userIdReadyCallback = uid => {
        this.customData.uidx = uid;
        this.firstLoadVideos();
      }
    }

    this.firstLoadVideos();

    if (this.customData.canUseSelector) {
      wx.onNetworkStatusChange((res) => {
        this.customData.isWifi = res.networkType === 'wifi';
      })
    }
  },

  firstLoadVideos: function () {//用于onLoad第一次加载videos
    wx.getStorage({
      key: 'lastBegin',//上次开始加载视频的信息 {begin: int,time: xxxx}
      success: (res) => {
        const objStr = res.data;
        if (!objStr) {
          this.loadVideos(1, true);
        } else {
          const lastBegin = JSON.parse(objStr);
          const nowTime = new Date().getTime();
          const diff = nowTime - parseInt(lastBegin.time);
          if (diff > 28800000) {//差值大于8小时28800000
            this.loadVideos(1, true);
            this.removeLastBegin();
          } else {
            this.loadVideos(parseInt(lastBegin.begin), true);
          }
        }
      },
      fail: () => {
        this.loadVideos(1, true);
      }
    });
  },

  removeLastBegin: function () {
    wx.removeStorage({
      key: 'lastBegin',
      success: function (res) {
      }
    });
  },

  getDanMu: function (nowId) {//获取弹幕
    this.customData.danmuTime = this.customData.currentTime;
    wx.request({
      url: Url + '/Work/SelectVideoBarrageList',
      data: {
        vid: nowId ? nowId : this.data.nowVideo,
        pointTime: this.customData.currentTime,
        aes: false
      },
      success: (res) => {
        if (res.data.errorcode == '00000:ok') {
          let newList = [];
          const result = res.data.result;
          for (let i = 0, len = result.length; i < len; i++) {
            const obj = result[i];
            const newObj = {
              text: decodeURI(obj.comment),
              color: '#ffffff',
              time: obj.pointtime
            };
            newList.push(newObj);
          }
          this.setData({
            danmu: newList
          });
        }
      }
    });
  },

  timeupdate: function (e) {
    const nowTime = parseInt(e.detail.currentTime);
    this.customData.currentTime = nowTime;
    if (Math.abs(nowTime - this.customData.danmuTime) >= 10) {
      this.getDanMu();
    }
  },

  pauseOldVideo: function () {
    this.handleScroll && clearTimeout(this.handleScroll);
    const lastId = this.data.nowVideo;
    if (lastId) {
      videoFull.AccelerometerStop();
      const lastVideo = wx.createVideoContext('index-video-' + lastId);
      lastVideo.pause();
    }
  },

  videoPlay: function (e) {
    this.customData.videoPlaying = true;
    this.customData.stopListen = false;
    videoFull.AccelerometerStart(wx.createVideoContext('index-video-' + this.data.nowVideo));
  },

  videoPause: function (e) {
    this.customData.videoPlaying = false;
    this.customData.stopListen = true;
    videoFull.AccelerometerStop();
  },

  doPlayVideo: function (vid, aid) {
    this.pauseOldVideo();
    this.customData.danmuTime = 0;
    this.customData.currentTime = 0;
    this.getDanMu(vid);

    this.setData({
      nowVideo: vid,
      danmu: []
    });
    addWatchNum(vid, aid);
  },


  clickPlayVideo: function (e) {
    const {vid, aid} = e.currentTarget.dataset;

    this.doPlayVideo(vid, aid);
  },

  clickSwiperItem: function (e) {
    this.pauseOldVideo();
    const dataset = e.currentTarget.dataset;
    if (dataset.vid) {
      navigateTo('/pages/details/details?vid=' + dataset.vid);
    }
  },

  toDetail: function (e) {
    this.pauseOldVideo();
    const vid = e.currentTarget.dataset.vid;
    navigateTo('/pages/details/details?vid=' + vid);
  },

  toSearch: function (e) {
    navigateTo('/pages/search/search');
  },

  enterAnswer: function (e) {
    if (this.customData.uidx) {
      navigateTo('/pages/answer/answer');
    } else {
      showSetting();
    }
  },

  setPraise: function (e) {
    if (this.customData.uidx) {
      const index = e.currentTarget.dataset.index;
      const video = this.data.videos[index];
      const oldPraise = video.isPraiseByuidx;
      const oldGoodNum = video.goodNum;
      video.isPraiseByuidx = oldPraise ? 0 : 1;
      video.goodNum = oldPraise ? video.goodNum - 1 : video.goodNum + 1;
      this.data.videos[index] = video;
      this.setData({
        videos: this.data.videos
      });
      wx.request({
        url: Url + '/Work/UpdateGoodNum?aes=false',
        method: 'POST',
        data: {
          userId: this.customData.uidx,
          opr: oldPraise,
          unique: '',
          vid: video.vid
        },
        success: (res) => {
          if (res.data.errorcode != '00000:ok') {
            video.isPraiseByuidx = oldPraise;
            video.goodNum = oldGoodNum;
            this.data.videos[index] = video;
            this.setData({
              videos: this.data.videos
            });
          }
        },
        fail: () => {
          video.isPraiseByuidx = oldPraise;
          video.goodNum = oldGoodNum;
          this.data.videos[index] = video;
          this.setData({
            videos: this.data.videos
          });
        }
      });
    } else {
      showSetting();
    }
  },

  videoEnd: function () {//播放结束退出全屏
    this.customData.videoPlaying = false;
    this.customData.stopListen = true;
    videoFull.AccelerometerStop();
    if (app.globalData.videoControl) {
      const lastId = this.data.nowVideo;
      if (lastId) {
        const lastVideo = wx.createVideoContext('index-video-' + lastId);
        lastVideo.exitFullScreen();
      }
    }
  },

  fullScreenChange: function (e) {
    if (e.detail.fullScreen) {//进入全屏
      this.customData.isFullScreen = true;
      videoFull.AccelerometerStop();
    } else {//退出全屏
      this.customData.isFullScreen = false;
      if (!this.customData.stopListen) {
        const lastId = this.data.nowVideo;
        if (lastId) {
          setTimeout(() => {
            videoFull.AccelerometerStart(wx.createVideoContext('index-video-' + lastId));
          }, 300);
        }
      }
    }
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady: function () {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {
    this.setData({
      isHide: false
    })
    const lastId = this.data.nowVideo;
    if (lastId) {
      videoFull.AccelerometerStart(wx.createVideoContext('index-video-' + lastId));
    }
    if (this.customData.canUseSelector) {
      wx.getNetworkType({//返回网络类型
        success: (res) => {
          this.customData.isWifi = res.networkType === 'wifi';
        }
      })
    }
  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide: function () {
    this.pauseOldVideo();
    this.setData({
      isHide: true
    })
  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload: function () {
    videoFull.AccelerometerStop();
  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh: function () {
    if (this.customData.loading) {
      wx.stopPullDownRefresh();
      showToast('正在加载数据，请稍后刷新');
    } else {
      this.setData({
        noVideos: false
      });
      this.loadVideos(this.customData.nextBegin, true, () => {
        wx.stopPullDownRefresh();
      });
    }
  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom: function () {
    if (!this.customData.loading && !this.data.noVideos) {
      this.loadVideos(this.customData.nextBegin, false);
    }
  },

  getFirstVideoInfo: function () {
    wx.createSelectorQuery().select('#video-item0').boundingClientRect((rect) => {
      this.customData.firstVideoH = rect && rect.height ? rect.height : 0;
      this.customData.firstVideoT = rect && rect.top ? rect.top : 0;
    }).exec()
  },

  firstVideoImgLoad: function () {
    if (this.customData.canUseSelector) {
      this.getFirstVideoInfo();
    }
  },

  onPageScroll: function (option) {
    const customData = this.customData;
    if (customData.canUseSelector && !customData.isFullScreen) {//能够使用wx.createSelectorQuery 且 视频非全屏
      if (!customData.firstVideoH || !customData.firstVideoT) {
        this.getFirstVideoInfo();//防止firstVideoImgLoad获取失败
      } else if (customData.videoPlaying) {//有视频在播放
        this.handleScroll && clearTimeout(this.handleScroll);
        this.handleScroll = setTimeout(() => {
          const scrollTop = option.scrollTop;
          let index = 0;
          if (scrollTop > customData.firstVideoT) {
            index = Math.ceil((scrollTop - customData.firstVideoT) / customData.firstVideoH);
          }
          wx.createSelectorQuery().select('#video-item' + index).boundingClientRect((rect) => {
            const { vid, aid } = rect.dataset;
            if (vid != this.data.nowVideo) {
              if (customData.isWifi) {
                this.doPlayVideo(vid, aid);
              } else {
                this.pauseOldVideo();
              }
            }
          }).exec()
        }, 350);
      }
    }
  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function (options) {
  }
})