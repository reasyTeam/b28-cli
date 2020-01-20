"use strict";

module.exports = function(optionsArr) {
  var optionsObj = {};

  if (optionsArr.length > 0) {
    for (var l = 0, len = optionsArr.length; l < len; l++) {
      if (optionsArr[l].indexOf("=") > 1) {
        let val = optionsArr[l].split("=")[1];
        val = val === "false" ? false : val === "true" ? true : val;
        optionsObj[optionsArr[l].split("=")[0].replace(/-+/, "")] = val;
      } else if (optionsArr[l].indexOf("-") === 0) {
        optionsObj[optionsArr[l].substring(1)] =
          typeof optionsArr[l + 1] === "string" &&
          optionsArr[l + 1].charAt(0) !== "-"
            ? ((l += 1), optionsArr[l])
            : true;
      } else {
        optionsObj[optionsArr[l].split("=")[0].replace(/-+/, "")] = true;
      }
    }
    if (optionsObj.encode) {
      for (var opt in optionsObj) {
        try {
          optionsObj[opt] = decodeURIComponent(optionsObj[opt]);
        } catch (e) {
          continue;
        }
      }
    }

    return optionsObj;
  }
  return {
    h: true
  };
};
