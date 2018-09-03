// pages/likes/likes.js
const Url = require('../../utils/server.js').url;
const Base64 = require('../../utils/base64.js').Base64;
const navigateTo = require('../../utils/jump.js').navigateTo;
const showToast = require('../../utils/toast.js').showToast;

const app = getApp();

Page({

  /**
   * 页面的初始数据
   */
  data: {
    loading: true,//是否正在获取
    likes: [],
    isEdit: false,
    selectedIds: [],
    isSelectedAll: false,
    isEmpty: false
  },

  customData: {
    uidx: null,
    hasShow: false,
    nextBegin: 21
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    this.reLoad();
  },

  reLoad: function () {
    if (app.globalData.userid) {
      this.customData.uidx = app.globalData.userid;
      this.getLikes(1);
    } else {
      app.userIdReadyCallback = uid => {
        this.customData.uidx = uid;
        this.getLikes(1);
      }
    }
  },

  getLikes: function (begin) {
    this.setData({
      loading: true
    });
    wx.request({
      url: Url + '/Work/GetVideoStreaming',
      data: {
        type: 2,
        uidx: this.customData.uidx,
        begin: begin,
        num: 8,
        unique: '',
        aes: false
      },
      success: (res) => {
        const result = res.data.result;
        if (result && result.length) {
          this.customData.nextBegin = begin + 8;
          let newList = [];
          for (let i = 0, len = result.length; i < len; i++) {
            const obj = result[i];
            obj.videoPicUrl = Base64.decode(obj.videoPicUrl);
            newList.push(obj);
          }
          this.setData({
            isEmpty: false,
            noMore: false,
            likes: begin == 1 ? newList : this.data.likes.concat(newList)
          });
          if (this.data.isSelectedAll) {
            this.setData({
              selectedIds: this.data.selectedIds.concat(this.returnIds(newList))
            });
          }
        } else {
          if (!this.data.likes.length) {
            this.setData({
              isEdit: false,
              selectedIds: [],
              isSelectedAll: false,
              isEmpty: true
            });
          } else {
            this.setData({
              noMore: true
            });
          }
        }
        this.setData({
          loading: false
        });
      },
      fail: () => {
        this.setData({
          loading: false
        });
      }
    });
  },

  loadMore: function (e) {
    if (!this.data.loading && !this.data.noMore) {
      this.getLikes(this.customData.nextBegin);
    }
  },

  switchEdit: function () {
    if (this.customData.uidx && !this.data.loading && !this.data.isEmpty) {//登录且没有加载时可切换编辑状态
      if (this.data.isEdit) {
        this.setData({
          isSelectedAll: false,
          selectedIds: []
        });
      }
      this.setData({
        isEdit: !this.data.isEdit
      });
    }
  },

  clickLike: function (e) {
    const vid = e.currentTarget.dataset.vid;
    if (this.data.isEdit) {
      const oldIds = this.data.selectedIds;
      const index = oldIds.indexOf(vid);
      if (index == -1) {
        oldIds.push(vid);
      } else {
        oldIds.splice(index, 1);
        this.setData({
          isSelectedAll: false
        });
      }
      this.setData({
        selectedIds: oldIds
      });
    } else {
      navigateTo('/pages/details/details?vid=' + vid);
    }
  },

  setSelectedAll: function (e) {
    if (this.data.isSelectedAll) {//变为全不选
      this.setData({
        selectedIds: []
      });
    } else {
      this.setData({
        selectedIds: this.returnIds(this.data.likes)
      });
    }
    this.setData({
      isSelectedAll: !this.data.isSelectedAll
    });
  },

  returnIds: function (arr) {
    return arr.map((o) => {
      return o.vid;
    })
  },

  deleteLikes: function (e) {
    const ids = this.data.selectedIds;
    if (ids.length) {
      wx.showToast({
        title: '正在删除',
        mask: true,
        icon: 'loading',
        duration: 60000
      })
      if (this.data.isSelectedAll) {//全删
        wx.request({
          url: Url + '/Work/DeleteAllPraiseVideo?aes=false',
          method: 'POST',
          data: {
            userId: this.customData.uidx
          },
          success: (res) => {
            wx.hideToast();
            if (res.data.errorcode == '00000:ok') {
              this.setData({
                likes: [],
                isEdit: false,
                selectedIds: [],
                isSelectedAll: false,
                isEmpty: true
              });
              this.getLikes(1);
              showToast('删除成功');
            } else {
              showToast('删除失败');
            }
          },
          fail: () => {
            wx.hideToast();
            showToast('删除失败');
          }
        });
      } else {
        wx.request({
          url: Url + '/Work/DeletePraiseVideoByVids?aes=false',
          method: 'POST',
          data: {
            userId: this.customData.uidx,
            vids: ids.join(',')
          },
          success: (res) => {
            wx.hideToast();
            if (res.data.errorcode == '00000:ok') {
              this.setData({
                likes: this.data.likes.filter((o) => {
                  return ids.indexOf(o.vid) == -1
                }),
                selectedIds: []
              });
              this.getLikes(1);
              showToast('删除成功');
            } else {
              showToast('删除失败');
            }
          },
          fail: () => {
            wx.hideToast();
            showToast('删除失败');
          }
        });
      }
    }
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {
    if (this.customData.hasShow) {
      this.reLoad();
    } else {
      this.customData.hasShow = true;
    }
  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide: function () {
    wx.hideToast();
  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload: function () {
    wx.hideToast();
  },
})