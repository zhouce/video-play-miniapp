// pages/search/search.js
const Url = require('../../utils/server.js').url;
const Base64 = require('../../utils/base64.js').Base64;
const trimBoth = require('../../utils/trim.js').trimBoth;
const navigateTo = require('../../utils/jump.js').navigateTo;

Page({

  /**
   * 页面的初始数据
   */
  data: {
    canIUse: wx.canIUse('rich-text'),
    hots: [],
    history: [],//搜索记录
    search: [],//搜索结果
    noMore: false,//无加载更多
    noSearch: false,//无搜索结果
    searchStr: ""
  },

  customData: {
    sTimeout: null,//搜索定时器
    nextBegin: 11,
    loading: true//是否正在搜索
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    wx.getStorage({
      key: 'sHistory',
      success: (res) => {
        const objStr = res.data;
        if (objStr) {
          this.setData({
            history: JSON.parse(objStr)
          });
        }
      }
    });

    wx.getSystemInfo({
      success: res => {
        const lowerStr = res.system.toLowerCase();
        wx.request({
          url: Url + '/Work/SelectPushSearchName',
          data: {
            channel: lowerStr.indexOf('ios') > -1 ? 1 : 0,//0安卓 1 ios
            aes: false
          },
          success: (res) => {
            if (res.data.errorcode == '00000:ok') {
              this.setData({
                hots: res.data.result
              });
            }
          }
        });
      }
    });
  },

  backIndex: function (e) {
    wx.navigateBack({
      delta: 1
    })
  },

  searchVideo: function (begin, skey) {
    this.customData.loading = true;
    wx.request({
      url: Url + '/Work/GetSearchVideoByKey',
      data: {
        uidx: 0,
        skey: skey,
        unique: "",
        begin: begin,
        num: 10,
        aes: false
      },
      success: (res) => {
        const result = res.data.result;
        if (result && result.length) {
          this.customData.nextBegin = begin + 10;
          let newList = [];
          for (let i = 0, len = result.length; i < len; i++) {
            const obj = result[i];
            obj.videoPicUrl = Base64.decode(obj.videoPicUrl);
            obj.nodes = obj.descriptions.replace(new RegExp(skey, "g"), "<span class='fc-search'>" + skey +"</span>");
            newList.push(obj);
          }
          this.setData({
            noSearch: false,
            noMore: false,
            search: begin == 1 ? newList : this.data.search.concat(newList)
          })
        } else {
            if (begin == 1) {//无搜索结果
              this.setData({
                noSearch: true
              });
            } else {//无加载更多
              this.setData({
                noMore: true
              });
            }
        }
        this.customData.loading = false;
      },
      fail: () => {
        this.customData.loading = false;
      }
    });
  },

  searchInput: function (e) {
    const clearStr = trimBoth(e.detail.value);
    this.setData({
      searchStr: e.detail.value
    })

    if (clearStr) {
      if (this.customData.sTimeout) {
        clearTimeout(this.customData.sTimeout);
        this.customData.sTimeout = null;
      }
      this.customData.sTimeout = setTimeout(() => {
        this.searchVideo(1, clearStr);
      }, 300);
    } else {
      this.setData({
        noSearch: false,
        noMore: false,
        search: []
      }) 
    }
  },

  loadMore: function (e) {
    if (!this.customData.loading && !this.data.noMore) {
      this.searchVideo(this.customData.nextBegin, trimBoth(this.data.searchStr));
    }
  },

  addHistory: function (str) {
    const oldHis = this.data.history;
    const oldIndex = oldHis.indexOf(str);
    if (oldIndex == -1) {
      if (oldHis.length == 5) {
        oldHis.splice(4, 1);
      }
    } else {
      oldHis.splice(oldIndex, 1);
    }
    oldHis.unshift(str);
    this.setData({
      history: oldHis
    });
    wx.setStorage({
      key: "sHistory",
      data: JSON.stringify(oldHis)
    })
  },

  removeHistory: function (e) {
    const index = e.currentTarget.dataset.index;
    const oldHis = this.data.history;
    oldHis.splice(index, 1);
    this.setData({
      history: oldHis
    });
    oldHis.length ? wx.setStorage({
      key: "sHistory",
      data: JSON.stringify(oldHis)
    }) : wx.removeStorage({
        key: 'sHistory',
      success: function (res) {
      }
    });
  },

  clearHistory: function (index) {
    this.setData({
      history: []
    });
    wx.removeStorage({
      key: 'sHistory',
      success: function (res) {
      }
    })
  },

  searchItem: function (e) {
    const str = e.currentTarget.dataset.str;
    this.searchVideo(1, str);
    this.setData({
      searchStr: str
    });
    this.addHistory(str);
  },

  toDetail: function (e) {
    navigateTo('/pages/details/details?vid=' + e.currentTarget.dataset.vid);
  },
})