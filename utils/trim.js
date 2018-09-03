const trimBoth = (str) => {
  return str.replace(/^\s+|\s+$/g, "");
}

module.exports = {
  trimBoth: trimBoth
}