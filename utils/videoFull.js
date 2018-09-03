let video = null;
let canControl = false;
let setFullTimeout = null;
let isSettingFull = false;

const setFullScreen = (direction) => {
  video.requestFullScreen({
    direction: direction
  });
  isSettingFull = false;
}

const AccelerometerChange = () => {
  canControl = true;
  wx.onAccelerometerChange(function (res) {
    if (video && !isSettingFull) {
      const diffX = res.x;
      if (diffX > 0.9) {//横屏
        isSettingFull = true;
        setFullScreen(-90);
      } else if (diffX < -0.9) {
        isSettingFull = true;
        setFullScreen(90);
      }
    }
  });
}

const AccelerometerStart = (v) => {
  if (canControl) {
    video = v;
    wx.startAccelerometer();
  }
}

const AccelerometerStop = () => {
  if (canControl) {
    video = null;
    isSettingFull = false;
    wx.stopAccelerometer();
  }
}

module.exports = {
  AccelerometerChange: AccelerometerChange,
  AccelerometerStart: AccelerometerStart,
  AccelerometerStop: AccelerometerStop
}
