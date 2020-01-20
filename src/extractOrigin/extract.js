import {
  log,
  loadFile,
  trim,
  LOG_TYPE,
  copyFile,
  string2Regexp,
  writeTextFile
} from "../util/index";

import { IGNORE_REGEXP, IGNORE_FUNCTIONS } from "../util/config";
import path from "path";

class Extract {
  constructor(option) {
    this.option = Object.assign(
      {},
      {
        onComplete: null,
        ignoreCode: /<!--\s*hide|-->/g,
        templateExp: /<%([^\n]*?)%>/g,
        customRules: []
      },
      option
    );
    this.init();
  }

  init() {
    this.curFilePath = "";
    this.words = [];
    this.isWorking = false;
    this.handleList = [];
    this.ignoreRE = IGNORE_REGEXP.slice(0);
    this.ignoreFuns = IGNORE_FUNCTIONS.slice(0);

    let customRules = this.option.customRules;
    if (Array.isArray(customRules)) {
      customRules.forEach(item => {
        if (typeof item === "function") {
          this.ignoreFuns.push(item);
        } else {
          this.ignoreRE.push(item);
        }
      });
    } else if (typeof customRules === "function") {
      this.ignoreFuns.push(customRules);
    } else if (customRules) {
      this.ignoreRE.push(string2Regexp(customRules));
    }
  }

  handleFile(filePath) {
    this.isWorking = true;
    this.curFilePath = filePath;
    return loadFile(filePath)
      .then(data => {
        log(`添加翻译函数-${filePath}`);
        return this.transNode(data);
      })
      .then(AST => {
        return this.scanNode(AST);
      })
      .then(fileData => {
        writeTextFile(
          path.resolve(
            this.option.baseWritePath,
            path.relative(this.option.baseReadPath, this.curFilePath)
          ),
          fileData
        );
        this.complete();
        return this.startTrans();
      })
      .catch(error => {
        this.copyFile(filePath);
        log(`文件[${filePath}]处理出错- ${error.message}`, LOG_TYPE.ERROR);
        return this.startTrans();
      });
  }

  copyFile(filePath) {
    copyFile(
      filePath,
      path.join(
        this.option.baseWritePath,
        path.relative(this.option.baseReadPath, filePath)
      )
    );
  }

  transNode(data) {
    return Promise.resolve(data);
  }

  setAttr(attr, value) {
    if (Object.prototype.toString.call(attr) === "[object Object]") {
      for (let key in attr) {
        this.setSingleAttr(key, attr[key]);
      }
    } else {
      this.setSingleAttr(attr, value);
    }
  }

  setSingleAttr(attr, value) {
    this.option[attr] = value;
  }

  startTrans() {
    if (this.handleList.length > 0) {
      return this.handleFile(this.handleList.shift());
    }
    return Promise.resolve("done");
  }

  addTask(filePath) {
    this.handleList.push(filePath);
  }

  addWord(word) {
    if (!this.words.includes(word)) {
      this.words.push(word);
    }
  }

  addWords(words) {
    words.forEach(word => {
      this.addWord(word);
    });
  }

  getWord(val) {
    if (!val || /^\s*$/.test(val)) {
      return "";
    }

    if (/\{%s\}/i.test(val)) {
      return val;
    }

    let skip = this.ignoreRE.some(item => item.test(val));
    if (skip) {
      return "";
    }

    for (let i = 0, l = this.ignoreFuns.length; i < l; i++) {
      let fun = this.ignoreFuns[i],
        str = val.replace(/(^\s+)|(\s+$)/g, "");

      if (typeof fun === "function") {
        if ((skip = fun(str))) {
          break;
        }
      }
    }
    if (skip) {
      return "";
    }

    let addValue = "";

    if (/[a-z]/i.test(val) || /[\u4e00-\u9fa5]/.test(val)) {
      addValue = val;
    }

    return addValue;
  }

  complete() {
    this.isWorking = false;
    this.option.onComplete &&
      this.option.onComplete(this.curFilePath, this.words);
    this.words = [];
  }
}

export default Extract;
