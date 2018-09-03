const url = 'https://service.xxx.com';//一般请求路径
const uploadurl = 'https://upload.xxx.com';//资源上传路径

const addWatchNum = (vid, aid) => {//增加播放次数
  wx.request({
    url: url + '/Work/AddWatchNum?aes=false',
    method: 'POST',
    data: {
      vid: vid,
      aid: aid
    }
  });
}

module.exports = {
  version: 'WxMiniApp-1.0.0',
  url: url,
  uploadurl: uploadurl,
  addWatchNum: addWatchNum
}
