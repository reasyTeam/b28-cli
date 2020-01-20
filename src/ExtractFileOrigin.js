import path from "path";
import fs from "fs";
import ExtractHTML from "./extractOrigin/extract_html_ori";
import ExtractJS from "./extractOrigin/extract_js_ori";

import {
  scanFolder,
  createFolder,
  copyFile,
  correctPath,
  LOG_TYPE,
  log
} from "./util/index";

import {
  EXCLUDE_FILE,
  EXCLUDE_FILE_END,
  EXTNAME_JS,
  EXTNAME_HTML
} from "./util/config";

const minimatch = require("minimatch");

class ExtractFile {
  constructor(option) {
    this.option = Object.assign(
      {},
      {
        baseReadPath: "",
        baseWritePath: ""
      },
      option
    );

    this.option.baseReadPath = correctPath(this.option.baseReadPath);
    this.option.baseWritePath = correctPath(this.option.baseWritePath);
    this.option.baseWritePath = path.join(this.option.baseWritePath, "outSrc");
    this.option.needCopy = true;

    this.fileList = {
      transList: [],
      copyList: [],
      folders: []
    };
    this.outData = [];

    this.init();
  }

  init() {
    let obj = {
      baseReadPath: this.option.baseReadPath,
      baseWritePath: this.option.baseWritePath
    };
    this.option.ignoreCode && (obj.ignoreCode = this.option.ignoreCode);
    this.option.templateExp && (obj.templateExp = this.option.templateExp);

    this.extractHTML = new ExtractHTML(obj);

    this.extractJS = new ExtractJS(obj);

    createFolder(this.option.baseWritePath);
  }

  scanFile() {
    this.outData = [];
    if (fs.lstatSync(this.option.baseReadPath).isDirectory()) {
      this.getFileList();
    } else {
      this.addFile(this.option.baseReadPath);
    }

    this.fileList.transList.forEach(filePath => {
      if (minimatch(filePath, EXTNAME_JS)) {
        this.extractJS.addTask(filePath);
      } else if (minimatch(filePath, EXTNAME_HTML)) {
        this.extractHTML.addTask(filePath);
      } else {
        this.fileList.copyList.push(filePath);
      }
    });

    if (this.option.needCopy) {
      this.copyFile();
    }

    return Promise.all([this.handleHtml(), this.handleJs()])
      .then(data => {
        this.reset();
        log(`处理完成`, LOG_TYPE.DONE);
        return this.outData;
      })
      .catch(err => {
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

  handleHtml() {
    return this.extractHTML.startTrans();
  }

  handleJs() {
    return this.extractJS.startTrans();
  }

  reset() {
    this.fileList = {
      transList: [],
      copyList: [],
      folders: []
    };
  }

  copyFile() {
    this.fileList.folders.forEach(val => {
      createFolder(
        path.join(
          this.option.baseWritePath,
          path.relative(this.option.baseReadPath, val)
        )
      );
    });

    this.fileList.copyList.forEach(filePath => {
      copyFile(
        filePath,
        path.join(
          this.option.baseWritePath,
          path.relative(this.option.baseReadPath, filePath)
        )
      );
    });
  }

  getFileList() {
    var scanData = scanFolder(this.option.baseReadPath);
    this.fileList.folders = scanData.folders;

    scanData.files.forEach(val => {
      this.addFile(val);
    });
  }

  addFile(filePath) {
    if (
      minimatch(filePath, EXCLUDE_FILE) ||
      minimatch(filePath, EXCLUDE_FILE_END) ||
      (!minimatch(filePath, EXTNAME_HTML) && !minimatch(filePath, EXTNAME_JS))
    ) {
      if (this.option.needCopy) {
        this.fileList.copyList.push(filePath);
      }
    } else {
      this.fileList.transList.push(filePath);
    }
  }
}

export default ExtractFile;
