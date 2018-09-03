const navigateTo = (url) => {
  wx.navigateTo({
    url: url
  })
}

module.exports = {
  navigateTo: navigateTo
}