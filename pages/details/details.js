// pages/details.js
const Url = require('../../utils/server.js').url;
const addWatchNum = require('../../utils/server.js').addWatchNum;
const Base64 = require('../../utils/base64.js').Base64;
const trimBoth = require('../../utils/trim.js').trimBoth;
const showToast = require('../../utils/toast.js').showToast;
const showSetting = require('../../utils/setting.js').showSetting;
const videoFull = require('../../utils/videoFull.js');

const app = getApp();

Page({

  /**
   * 页面的初始数据
   */
  data: {
    canIUse: wx.canIUse('button.open-type.share'),
    obj: {},//视频内容
    authorHeadPhoto: '',
    videoPicUrl: '',
    videoUrl: '',
    comments: [],
    noComment: false,//评论是否加载完
    comment: '',
    danmuStr: '',
    bholder: null,//当前要回复的人的input的placeholder
    focus: false,//评论input是否focus
    danmu: []
  },

  customData: {
    loading: true,//是否正在加载评论
    sending: false,//是否正在发送评论
    danmuing: false,//是否正在发送弹幕
    cid: 0,
    vid: 0,
    danmuTime: 0,//上次获取弹幕的时间
    currentTime: 0,//当前视频播放时间
    buidx: null,//要回复的userid
    bcid: null,//要回复的评论id
    uidx: 0,
    stopListen: false//视频结束或暂停时 停止监听加速器
  },

  loadComments: function () {
    this.customData.loading = true;
    wx.request({
      url: Url + '/Work/SelectVideoCommentList',
      data: {
        vid: this.customData.vid,
        cid: this.customData.cid,
        num: 8,
        aes: false
      },
      success: (res) => {
        if (res.data.errorcode == '00000:ok') {
          let newList = [];
          let cids = [];
          const result = res.data.result;
          for (let i = 0, len = result.length; i < len; i++) {
            const obj = result[i];
            obj.headphoto = Base64.decode(obj.headphoto);
            obj.comment = decodeURI(obj.comment);
            newList.push(obj);
            cids.push(obj.cid);
          }
          this.setData({
            comments: this.data.comments.concat(newList)
          })

          this.customData.cid = Math.min(...cids);
        } else if (res.data.errorcode == '10007') {//加载完 无数据了
          this.setData({
            noComment: true
          });
        }
        this.customData.loading = false;
      },
      fail: () => {
        this.customData.loading = false;
      }
    });
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    this.customData.vid = options.vid;
    if (app.globalData.userid) {
      this.customData.uidx = app.globalData.userid;
    } else {
      app.userIdReadyCallback = uid => {
        this.customData.uidx = uid;
        this.getVideo();
      }
    }

    this.getDanMu();
    this.getVideo();
    this.loadComments();
  },

  getDanMu: function () {//获取弹幕
    this.customData.danmuTime = this.customData.currentTime;
    wx.request({
      url: Url + '/Work/SelectVideoBarrageList',
      data: {
        vid: this.customData.vid,
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

  getVideo: function () {
    wx.request({
      url: Url + '/Work/GetVideoInfoById',
      data: {
        vid: this.customData.vid,
        userid: this.customData.uidx,
        aes: false
      },
      success: (res) => {
        if (res.data.errorcode == '00000:ok') {
          const result = res.data.result[0];
          this.setData({
            obj: result,
            authorHeadPhoto: Base64.decode(result.authorHeadPhoto),
            videoPicUrl: Base64.decode(result.videoPicUrl),
            videoUrl: Base64.decode(result.videoUrl)
          });

          addWatchNum(result.vid, result.aid);//增加播放次数
        }
      }
    });
  },

  loadMore: function (e) {
    if (!this.customData.loading && !this.data.noComment) {
      this.loadComments();
    }
  },

  setFocus: function (value = true) {
    if (!value) {
      this.customData.buidx = null;
      this.customData.bcid = null;
      this.setData({
        bholder: ''
      });
    }

    this.setData({
      focus: value
    });
  },

  timeupdate: function (e) {
    const nowTime = parseInt(e.detail.currentTime);
    this.customData.currentTime = nowTime;
    if (Math.abs(nowTime - this.customData.danmuTime) >= 10) {
      this.getDanMu();
    }
  },

  confirmSend: function (e) {
    if (!this.customData.sending) {
      this.sendComment();
    }
  },

  confirmDanMuSend: function (e) {
    if (!this.customData.danmuing) {
      this.sendDanmuBack();
    }
  },

  setPraise: function (e) {
    if (this.customData.uidx) {
      const oldPraise = this.data.obj.isPraiseByuidx;
      this.data.obj.isPraiseByuidx = oldPraise ? 0 : 1;
      this.setData({
        obj: this.data.obj
      });
      wx.request({
        url: Url + '/Work/UpdateGoodNum?aes=false',
        method: 'POST',
        data: {
          userId: this.customData.uidx,
          opr: oldPraise,
          unique: '',
          vid: this.customData.vid
        },
        success: (res) => {
          if (res.data.errorcode != '00000:ok') {
            this.data.obj.isPraiseByuidx = oldPraise;
            this.setData({
              obj: this.data.obj
            });
          }
        },
        fail: () => {
          this.data.obj.isPraiseByuidx = oldPraise;
          this.setData({
            obj: this.data.obj
          });
        }
      });
    } else {
      showSetting();
    }
  },

  deleteComment: function (cid) {
    wx.request({
      url: Url + '/Work/DeleteVideoComment?aes=false',
      method: 'POST',
      data: {
        vid: this.data.obj.vid,
        cid: cid
      },
      success: (res) => {
        if (res.data.errorcode == '00000:ok') {
          this.customData.cid = 0;
          this.setData({
            comments: [],
            noComment: false
          });
          this.loadComments();
        } else {
          showToast('删除失败');
        }
      },
      fail: () => {
        showToast('删除失败');
      }
    });
  },

  commentUser: function (e) {
    const dataset = e.currentTarget.dataset;
    if (this.data.focus) {
      this.setFocus(false);
    } else if (dataset.uidx == this.customData.uidx) {//用户点击自己的评论
      wx.showModal({
        title: '',
        content: '删除我的评论',
        confirmText: "删除",
        confirmColor: "#d40000",
        cancelColor: "#0077ff",
        success: (res) => {
          if (res.confirm) {
            this.deleteComment(dataset.cid);
          }
        }
      });
    } else {
      this.customData.buidx = dataset.uidx;
      this.customData.bcid = dataset.cid;

      this.setData({
        bholder: `回复${dataset.nickname}:`,
        focus: true
      });
    }
  },

  sendComment: function (identify = 0) {
    if (this.customData.uidx) {
      const trimStr = trimBoth(this.data.comment);
      if (!trimStr) {
        showToast('评论不能为空');
        this.setFocus(false);
      } else {
        this.customData.sending = true;
        this.sendDanmuFront(trimStr);
        wx.request({
          url: Url + '/Work/AddVideoComment?aes=false',
          method: 'POST',
          data: {
            uidx: this.customData.uidx,
            buidx: this.customData.buidx ? this.customData.buidx : this.data.obj.aid,
            vid: this.data.obj.vid,
            comment: encodeURI(trimStr),
            pointTime: this.customData.currentTime,
            replycid: this.customData.bcid ? this.customData.bcid : 0,
            identify: this.customData.buidx ? 1 : 0
          },
          success: (res) => {
            if (res.data.errorcode == '00000:ok') {
              this.customData.cid = 0;
              this.setData({
                comments: [],
                comment: '',
                noComment: false
              });
              this.loadComments();
            } else {
              showToast('评论失败');
            }
            this.setFocus(false);
            this.customData.sending = false;
          },
          fail: () => {
            showToast('评论失败');
            this.setFocus(false);
            this.customData.sending = false;
          }
        });
      }
    } else {
      showSetting();
    }
  },

  sendDanmuFront: function (str) {//前端显示发送弹幕
    this.Video.sendDanmu({
      text: str,
      color: '#3CC51F'
    })
  },

  sendDanmuBack: function () {//给后端发送弹幕
    if (this.customData.uidx) {
      const trimStr = trimBoth(this.data.danmuStr);
      if (!trimStr) {
        showToast('弹幕不能为空');
      } else {
        this.customData.danmuing = true;
        this.sendDanmuFront(trimStr);
        wx.request({
          url: Url + '/Work/AddVideoBarrage?aes=false',
          method: 'POST',
          data: {
            uidx: this.customData.uidx,
            buidx: this.customData.buidx ? this.customData.buidx : this.data.obj.aid,
            vid: this.data.obj.vid,
            comment: encodeURI(trimStr),
            uniques: '',
            pointTime: this.customData.currentTime
          },
          success: (res) => {
            if (res.data.errorcode == '00000:ok') {
              this.setData({
                danmuStr: ''
              });
            }
            this.customData.danmuing = false;
          },
          fail: () => {
            this.customData.danmuing = false;
          }
        });
      }
    } else {
      showSetting();
    }
  },

  hasDanMuInput: function (e) {//弹幕
    this.setData({
      danmuStr: e.detail.value
    })
  },

  hasInput: function (e) {
    this.setData({
      comment: e.detail.value
    })
  },

  pauseVideo: function () {
    videoFull.AccelerometerStop();
    this.Video.pause();
  },

  videoPlay: function (e) {
    this.customData.stopListen = false;
    videoFull.AccelerometerStart(wx.createVideoContext('topVideo'));
  },

  videoPause: function (e) {
    this.customData.stopListen = true;
    videoFull.AccelerometerStop();
  },

  videoEnd: function () {//播放结束退出全屏
    this.customData.stopListen = true;
    videoFull.AccelerometerStop();
    if (app.globalData.videoControl) {
      this.Video.exitFullScreen();
    }
  },

  fullScreenChange: function (e) {
    if (e.detail.fullScreen) {//进入全屏
      videoFull.AccelerometerStop();
    } else if (!this.customData.stopListen) {
      setTimeout(() => {
        videoFull.AccelerometerStart(wx.createVideoContext('topVideo'));
      }, 300);
    }
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady: function () {
    this.Video = wx.createVideoContext('topVideo');
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {
    videoFull.AccelerometerStart(wx.createVideoContext('topVideo'));
  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide: function () {
    this.pauseVideo();
  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload: function () {
    videoFull.AccelerometerStop();
  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function () {
  }
})