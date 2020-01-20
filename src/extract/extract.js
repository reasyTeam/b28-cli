import {
  log,
  loadFile,
  trim,
  LOG_TYPE,
  copyFile,
  writeTextFile
} from "../util/index";
let IGNORE_REGEXP = [
  /^[\s0-9]*$/,
  /^(([a-z0-9]+[\.,;\?\\_\:\-/&\=<>\[\]\(\)\|]+)|([\.,;\?\\_\:\-/&\=<>\[\]\(\)\|]+[a-z0-9]+))[a-z0-9\.,;\?\\_\:\-/&\=<>\[\]\(\)\|]*$/i,
  /<%([\s\S]*)%>/i,
  /\(\[([\s\S]*)\]\)/i,
  /^(&nbsp;|&gt;|&lt;)+$/i,
  /^(\s*<\s*\/([a-z0-9]+)?>\s*)*$/i,
  /^((ht|f)tps?):\/\/([\w\-]+(\.[\w\-]+)*\/)*[\w\-]+(\.[\w\-]+)*\/?(\?([\w\-\.,@?^=%&:\/~\+#]*)+)?/i
];

import path from "path";

class Extract {
  constructor(option) {
    this.option = Object.assign(
      {},
      {
        CONFIG_HONG: {},
        onlyZH: false,
        transWords: {},
        isTranslate: false,
        isCheckTrans: false,
        baseWritePath: "",
        baseReadPath: "",
        onComplete: null
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
    this.CONFIG_HONG = this.option.CONFIG_HONG || {};
  }

  handleFile(filePath) {
    log(`开始提取文件-${filePath}`);
    this.isWorking = true;
    this.curFilePath = filePath;
    return loadFile(filePath)
      .then(data => {
        return this.transNode(data);
      })
      .then(AST => {
        return this.scanNode(AST);
      })
      .then(fileData => {
        if (this.option.isTranslate) {
          log(`翻译文件-${filePath}`);
          writeTextFile(
            path.resolve(
              this.option.baseWritePath,
              path.relative(this.option.baseReadPath, this.curFilePath)
            ),
            fileData
          );
        }
        this.complete();
        return this.startTrans();
      })
      .catch(error => {
        this.option.isTranslate && this.copyFile(filePath);
        log(`文件[${filePath}]处理出错- ${error}`, LOG_TYPE.ERROR);
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
    if (attr === "CONFIG_HONG") {
      this.CONFIG_HONG = value;
    }
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

  getWord(val, isJs) {
    if (!val || /^\s*$/.test(val)) {
      return "";
    }
    if (!isJs) {
      let skip = IGNORE_REGEXP.some(item => item.test(val));
      if (skip) {
        return "";
      }
    }

    val = trim(val);
    val = val.replace(/(^\s+)|(\s+$)/g, "");
    val = isJs ? val.replace(/([^\S\n]+)/g, " ") : val.replace(/(\s+)/g, " ");
    let addValue = "";
    if (/^<%=((.|\n)*)%>$/.test(val)) {
      return "";
    }

    if (this.option.onlyZH) {
      if (/[\u4e00-\u9fa5]/.test(val)) {
        addValue = val;
      }
    } else if (/[a-z]/i.test(val) || /[\u4e00-\u9fa5]/.test(val)) {
      addValue = val;
    }

    if (addValue) {
      if (this.option.isTranslate || this.option.isCheckTrans) {
        let transVal = this.option.transWords[addValue];
        if (transVal) {
          return this.option.isCheckTrans ? "" : transVal;
        }
      }
      this.addWord(addValue);
    }
    return "";
  }

  complete() {
    this.isWorking = false;
    this.option.onComplete &&
      this.option.onComplete(this.curFilePath, this.words);
    this.words = [];
  }
}

export default Extract;
