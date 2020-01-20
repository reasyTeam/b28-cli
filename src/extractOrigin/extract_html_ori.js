const jsdom = require("jsdom");
const { JSDOM } = jsdom;
import { log, LOG_TYPE, trim } from "../util/index";
import ExtractJS from "./extract_js_ori";
import Extract from "./extract";

class ExtractHTML extends Extract {
  constructor(option) {
    super(option);

    this.extractJS = new ExtractJS({
      ignoreCode: this.option.ignoreCode,
      templateExp: this.option.templateExp
    });
    this.jsHandleList = [];
  }

  transNode(html) {
    this.oldHtml = html;
    this.scripts = [];
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
      let match = outHtml.match(/<script\b[^>]*>[\s\S]*?<\/script>/g);
      outHtml = this.oldHtml.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, () =>
        match.shift()
      );

      return outHtml;
    });
  }

  handleJsTask(child) {
    return this.extractJS
      .transNode(child.nodeValue, true)
      .then(AST => {
        return this.extractJS.scanNode(AST);
      })
      .then(fileData => {
        child.nodeValue = fileData;
        return this.nextJsTask();
      })
      .catch(() => {
        return this.nextJsTask();
      });
  }

  nextJsTask() {
    if (this.jsHandleList.length > 0) {
      return this.handleJsTask(this.jsHandleList.shift());
    }
    return Promise.resolve("done");
  }

  addJsTask(handle) {
    this.jsHandleList.push(handle);
  }

  listNode(element) {
    if (!element) {
      return;
    }

    let firstChild = element.firstChild,
      nextSibling = element.nextSibling,
      nodeType = element.nodeType,
      nodeName = element.nodeName.toLowerCase();
    if (nodeType === 1 && nodeName == "script") {
      if (firstChild && firstChild.nodeValue && trim(firstChild.nodeValue)) {
        this.addJsTask(firstChild);
      }
    } else {
      if (firstChild) {
        this.listNode(firstChild);
      }
    }

    if (nextSibling) {
      this.listNode(nextSibling);
    }
  }
}

export default ExtractHTML;
