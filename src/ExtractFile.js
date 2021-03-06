import path from "path";
import fs from "fs";
import ExtractHTML from "./extract/extract-html";
import ExtractJS from "./extract/extract-js";
import ExtractVUE from "./extract/extract-vue";
import ExtractRegexp from "./extract/extract-regexp";
const cp = require("child_process");
const minimatch = require("minimatch");

import {
  scanFolder,
  createFolder,
  copyFile,
  writeExcel,
  correctPath,
  LOG_TYPE,
  log
} from "./util/index";

import {
  EXCLUDE_FILE,
  EXCLUDE_FILE_END,
  EXTNAME_JS,
  EXTNAME_OTHER,
  EXTNAME_VUE,
  EXTNAME_HTML
} from "./util/config";
let transFiles = [EXTNAME_JS, EXTNAME_VUE, EXTNAME_HTML, EXTNAME_OTHER];

class ExtractFile {
  constructor(option) {
    this.option = Object.assign(
      {},
      {
        baseReadPath: "",
        baseWritePath: "",
        onlyZH: false,
        isTranslate: false,
        isCheckTrans: false,
        hongPath: "",
        transWords: {},
        needFilePath: true,
        writeExcel: true
      },
      option
    );

    this.option.baseReadPath = correctPath(this.option.baseReadPath);
    this.option.baseWritePath = correctPath(this.option.baseWritePath);
    this.option.hongPath = correctPath(this.option.hongPath);
    this.oldData = Object.assign({}, this.option.transWords || {});

    console.log("hongpath", this.option.hongPath);

    this.fileList = {
      // 需要进行提取和翻译的文件
      transList: [],
      // 不需要翻译，直接进行copy的文件
      copyList: [],
      folders: []
    };
    this.outData = [];

    if (this.option.hongPath) {
      try {
        require(this.option.hongPath);
        this.CONFIG_HONG = (global.R && global.R.CONST) || {};
      } catch (e) {
        this.CONFIG_HONG = {};
        log(
          `宏文件解析错误，宏文件地址-${this.option.hongPath}`,
          LOG_TYPE.WARNING
        );
      }
    }

    this.init();
  }

  init() {
    this.extractHTML = new ExtractHTML({
      CONFIG_HONG: this.CONFIG_HONG,
      onlyZH: this.option.onlyZH,
      transWords: this.option.transWords,
      isTranslate: this.option.isTranslate,
      isCheckTrans: this.option.isCheckTrans,
      baseWritePath: this.option.baseWritePath,
      baseReadPath: this.option.baseReadPath,
      // 词条提取完成后的操作
      oldData: this.oldData,
      onComplete: (filePath, words) => {
        if (words.length > 0) {
          if (this.option.needFilePath) {
            this.outData.push(correctPath(filePath));
          }
          this.outData = this.outData.concat(words);
        }
      }
    });

    this.extractJS = new ExtractJS({
      CONFIG_HONG: this.CONFIG_HONG,
      onlyZH: this.option.onlyZH,
      transWords: this.option.transWords,
      isTranslate: this.option.isTranslate,
      isCheckTrans: this.option.isCheckTrans,
      baseWritePath: this.option.baseWritePath,
      oldData: this.oldData,
      baseReadPath: this.option.baseReadPath,
      // 词条提取完成后的操作
      onComplete: (filePath, words) => {
        if (words.length > 0) {
          if (this.option.needFilePath) {
            this.outData.push(correctPath(filePath));
          }
          this.outData = this.outData.concat(words);
        }
      }
    });

    this.extractVUE = new ExtractVUE({
      CONFIG_HONG: this.CONFIG_HONG,
      onlyZH: this.option.onlyZH,
      transWords: this.option.transWords,
      isTranslate: this.option.isTranslate,
      isCheckTrans: this.option.isCheckTrans,
      baseWritePath: this.option.baseWritePath,
      baseReadPath: this.option.baseReadPath,
      // 词条提取完成后的操作
      oldData: this.oldData,
      onComplete: (filePath, words) => {
        if (words.length > 0) {
          if (this.option.needFilePath) {
            this.outData.push(correctPath(filePath));
          }
          this.outData = this.outData.concat(words);
        }
      }
    });

    this.extractRegexp = new ExtractRegexp({
      CONFIG_HONG: this.CONFIG_HONG,
      onlyZH: this.option.onlyZH,
      transWords: this.option.transWords,
      isTranslate: this.option.isTranslate,
      isCheckTrans: this.option.isCheckTrans,
      baseWritePath: this.option.baseWritePath,
      baseReadPath: this.option.baseReadPath,
      // 词条提取完成后的操作
      oldData: this.oldData,
      onComplete: (filePath, words) => {
        if (words.length > 0) {
          if (this.option.needFilePath) {
            this.outData.push(correctPath(filePath));
          }
          this.outData = this.outData.concat(words);
        }
      }
    });

    if (this.option.commandType == 8) {
      return this.outData;
    }
  }

  scanFile() {
    this.outData = [];
    if (fs.lstatSync(this.option.baseReadPath).isDirectory()) {
      this.getFileList();
    } else {
      this.addFile(this.option.baseReadPath);
    }

    this.fileList.transList.forEach((filePath) => {
      if (minimatch(filePath, EXTNAME_JS)) {
        // js文件
        this.extractJS.addTask(filePath);
      } else if (minimatch(filePath, EXTNAME_HTML)) {
        // html文件
        this.extractHTML.addTask(filePath);
      } else if (minimatch(filePath, EXTNAME_VUE)) {
        // vue文件
        this.extractVUE.addTask(filePath);
      } else if (minimatch(filePath, EXTNAME_OTHER)) {
        // 其它文件处理
        this.extractRegexp.addTask(filePath);
      } else {
        this.fileList.copyList.push(filePath);
      }
    });

    if (this.option.isTranslate) {
      this.copyFile();
    }

    // 将未翻译的文件以错误的形式输出
    // 将提取的词条文件，输出为excel
    return Promise.all(this.startHandle())
      .then((errorList) => {
        errorList.forEach((item) => {
          item.length > 0 && this.extractRegexp.addTasks(item);
        });
        if(this.extractRegexp.handleList.length > 0){
        log(`开始重新提取出错文件`, LOG_TYPE.DONE, '## NOTICE ##');
        }
        return this.extractRegexp.startTrans();
      })
      .then(() => {
        let sheetName = this.extractJS.option.onlyZH ? "CN" : "EN";

        if (this.option.isTranslate) {
          log(
            `翻译后的文件输出到路径-${this.option.baseWritePath}下.`,
            LOG_TYPE.DONE
          );
        } else if (!this.option.isCheckTrans) {
          this.outData.unshift(sheetName);
        }

        let outPath = path.join(
          this.option.baseWritePath,
          (this.option.isTranslate ? "未匹配的词条" : "提取词条") +
            `${sheetName}.xlsx`
        );

        if (this.option.isCheckTrans) {
          this.outData.unshift(
            "[----B28-CLI----#----在代码中存在但是json中不存在的词条----#----B28-CLI----]"
          );
          this.outData.push(
            "[----B28-CLI----#----在json中存在但是代码中不存在的词条----#----B28-CLI----]"
          );
          for (let key in this.oldData) {
            if (this.oldData.hasOwnProperty(key)) {
              this.outData.push(key);
            }
          }
        }

        if (this.outData.length > 0) {
          this.outData = Array.from([...new Set(this.outData)][0]);
          if (this.option.writeExcel) {
            this.writeWordToExcel(outPath, sheetName);
          }

          if (this.option.isTranslate || this.option.isCheckTrans) {
            log(
              `还有部分词条未被翻译，见输出的Excel-${outPath}`,
              LOG_TYPE.WARNING
            );
          }
        } else if (this.option.isTranslate || this.option.isCheckTrans) {
          log(`success, 未发现未翻译的词条`, LOG_TYPE.DONE);
        }
        //重置
        this.reset();
        return this.outData;
      })
      .catch((err) => {
        log(`文件处理出错，${err}`, LOG_TYPE.ERROR);
      });
  }

  setAttr(attr, val) {
    if (typeof attr === "object") {
      Object.assign(this.option, attr);
    } else {
      this.option[attr] = val;
    }

    this.extractHTML.setAttr(attr, val);
    this.extractJS.setAttr(attr, val);
  }

  writeWordToExcel(outPath, sheetName) {
    writeExcel(this.outData, outPath, sheetName)
      .then(() => {
        if (!this.option.isTranslate && !this.option.isCheckTrans) {
          log(`语言文件输出为-${outPath}`, LOG_TYPE.DONE);
        }
      })
      .catch((error) => {
        log(error.message, LOG_TYPE.error);
        let outPath = path.join(
          this.option.baseWritePath,
          (this.option.isTranslate ? "未匹配的词条" : "提取词条") +
            `${new Date().getTime()}.xlsx`
        );
        this.writeWordToExcel(outPath, sheetName);
      });
  }

  handleHtml(filePath) {
    return this.extractHTML.startTrans();
  }

  handleJs(filePath) {
    return this.extractJS.startTrans();
  }

  startHandle() {
    return [
      this.extractHTML.startTrans(),
      this.extractJS.startTrans(),
      this.extractVUE.startTrans(),
      this.extractRegexp.startTrans()
    ];
  }

  reset() {
    this.fileList = {
      transList: [],
      copyList: [],
      folders: []
    };
  }

  copyFile() {
    // 拷贝文件
    this.fileList.folders.forEach((val) => {
      createFolder(
        path.join(
          this.option.baseWritePath,
          path.relative(this.option.baseReadPath, val)
        )
      ); //创建目录
    });

    //如果是翻译模式需要将未匹配的文件原样拷贝
    this.fileList.copyList.forEach((filePath) => {
      copyFile(
        filePath,
        path.join(
          this.option.baseWritePath,
          path.relative(this.option.baseReadPath, filePath)
        )
      );
    });
  }

  //提取文件，并且拷贝不需要操作的文件
  getFileList() {
    var scanData = scanFolder(this.option.baseReadPath);
    this.fileList.folders = scanData.folders;

    scanData.files.forEach((val) => {
      this.addFile(val);
    });
  }

  addFile(filePath) {
    if (
      minimatch(filePath, EXCLUDE_FILE) ||
      minimatch(filePath, EXCLUDE_FILE_END) ||
      !transFiles.some((itemRE) => minimatch(filePath, itemRE))
    ) {
      if (this.option.isTranslate) {
        this.fileList.copyList.push(filePath);
      }
    } else {
      this.fileList.transList.push(filePath);
    }
  }
}

export default ExtractFile;
