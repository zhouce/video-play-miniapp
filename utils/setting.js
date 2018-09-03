const app = getApp();

const showSetting = () => {
  wx.showModal({
    title: '是否要打开设置页面重新授权',
    content: '需要获取您的公开信息（昵称、头像等），请到小程序的设置中打开用户信息授权',
    confirmText: "去设置",
    success: (res) => {
      if (res.confirm) {
        wx.openSetting({
          success: (res) => {
            if (res.authSetting["scope.userInfo"]) {
              app.doLogin();
            }
          }
        })
      }
    }
  });
}

module.exports = {
  showSetting: showSetting
}