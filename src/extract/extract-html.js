const jsdom = require("jsdom");
const { JSDOM } = jsdom;
import { log, LOG_TYPE, trim } from "../util/index";
import ExtractJS from "./extract-js";
import Extract from "./extract";

const HANDLE_ATTRIBUTE = ["alt", "placeholder", "title", "data-title"];
const Edit_TYPE = {
  attribute: 1,
  value: 2,
  html: 3,
  nodeValue: 4,
  title: 5
};

class ExtractHTML extends Extract {
  constructor(option) {
    super(option);

    this.extractJS = new ExtractJS({
      CONFIG_HONG: this.option.CONFIG_HONG,
      onlyZH: this.option.onlyZH,
      transWords: this.option.transWords,
      isTranslate: this.option.isTranslate
    });

    this.jsHandleList = [];
  }

  transNode(html) {
    this.getHeaderTag(html);

    return new Promise((resolve, reject) => {
      try {
        const virtualConsole = new jsdom.VirtualConsole();
        let dom = new JSDOM(html, {
          virtualConsole
        });
        let document = dom.window.document;
        resolve(document);
      } catch (err) {
        reject(err);
      }
    });
  }

  getHeaderTag(html) {
    this.hasHeader = !!html.match(/\<head\>/g);
    this.hasBody = !!html.match(/\<body([^>]*)\>/g);
  }

  scanNode(document) {
    this.listNode(document.documentElement);

    return this.nextJsTask().then(() => {
      let outHtml = document.documentElement.innerHTML;

      if (!this.hasHeader) {
        outHtml = outHtml.replace(/\<head\>[\s\S]*\<\/head\>/g, "");
      }
      if (!this.hasBody) {
        outHtml = outHtml.replace(/(\<body([^>]*)\>)|(\<\/body\>)/g, "");
      }
      outHtml = outHtml.replace(/^\s*|\s*$/g, "");
      outHtml = document.doctype
        ? "<!Doctype html>\t\n<html>\t\n" + outHtml + "\t\n</html>"
        : outHtml;

      return outHtml;
    });
  }

  listNode(element) {
    if (!element) {
      return;
    }

    let firstChild = element.firstChild,
      nextSibling = element.nextSibling,
      nodeType = element.nodeType,
      nodeName = element.nodeName.toLowerCase(),
      btnStr = "submit,reset,button",
      curValue;
    switch (nodeType) {
      case 1:
        let hong = element.getAttribute("data-hong"),
          isInputButton =
            nodeName == "input" &&
            btnStr.includes(element.getAttribute("type")),
          dataOption = element.getAttribute("data-options");

        if (hong && this.CONFIG_HONG[hong] === false) {
          if (nextSibling) {
            this.listNode(nextSibling);
          }
          return;
        }

        if (element.getAttribute("data-nowrap") == 1) {
          curValue = this.getWord(element.innerHTML);
          this.transWord(element, Edit_TYPE.html, curValue);

          if (nextSibling) {
            this.listNode(nextSibling);
          }
          return;
        }

        if (nodeName == "script" || nodeName == "style") {
          if (nodeName == "script") {
            if (
              firstChild &&
              firstChild.nodeValue &&
              trim(firstChild.nodeValue)
            ) {
              this.addJsTask(firstChild);
            }
          }
          nextSibling && this.listNode(nextSibling);
          return;
        }

        // noscript内的文本不处理
        if (nodeName === "noscript") {
          nextSibling && this.listNode(nextSibling);
          return;
        }

        HANDLE_ATTRIBUTE.forEach(attr => {
          curValue = this.getWord(element.getAttribute(attr));
          this.transWord(element, Edit_TYPE.attribute, curValue, attr);
        });

        if (isInputButton) {
          curValue = this.getWord(element.value);
          this.transWord(element, Edit_TYPE.value, curValue);
          if (element.getAttribute("data-lang")) {
            curValue = this.getWord(element.getAttribute("data-lang"));
            this.transWord(element, Edit_TYPE.attribute, curValue, "data-lang");
          }
        } else if (dataOption) {
          try {
            curValue = JSON.parse(dataOption);
            curValue.msg = this.getWord(curValue.msg);
            curValue.msg &&
              this.transWord(
                element,
                Edit_TYPE.attribute,
                JSON.stringify(curValue),
                "data-options"
              );
          } catch (e) {
            log("data-option 不是json格式数据", LOG_TYPE.WARNING);
          }
        } else {
          curValue = this.getWord(element.getAttribute("data-lang"));
          this.transWord(element, Edit_TYPE.attribute, curValue, "data-lang");
        }
        break;
      case 3:
        if (/\S/.test(element.nodeValue)) {
          curValue = this.getWord(element.nodeValue);
          this.transWord(element, Edit_TYPE.nodeValue, curValue);
        }
        break;
    }

    firstChild && this.listNode(firstChild);
    nextSibling && this.listNode(nextSibling);
  }

  handleJsTask(child) {
    return this.extractJS
      .transNode(child.nodeValue)
      .then(AST => {
        return this.extractJS.scanNode(AST);
      })
      .then(fileData => {
        child.nodeValue = fileData;
        return this.nextJsTask();
      })
      .catch(error => {
        console.log(error);
        log(`内联JS处理出错- ${error}`, LOG_TYPE.error);
        return this.nextJsTask();
      });
  }

  nextJsTask() {
    if (this.jsHandleList.length > 0) {
      return this.handleJsTask(this.jsHandleList.shift());
    }
    this.addWords(this.extractJS.words);
    this.extractJS.words = [];
    return Promise.resolve("done");
  }

  addJsTask(handle) {
    this.jsHandleList.push(handle);
  }

  transWord(element, type, value, field) {
    if (value) {
      switch (type) {
        case Edit_TYPE.attribute:
          element.setAttribute(field, value);
          break;
        case Edit_TYPE.html:
          element.innerHTML = value;
          break;
        case Edit_TYPE.value:
          element.setAttribute("value", value);
          break;
        case Edit_TYPE.nodeValue:
          element.nodeValue = value;
          break;
        case Edit_TYPE.title:
          element.title = value;
          break;
      }
    }
  }
}

export default ExtractHTML;
