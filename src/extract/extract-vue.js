import { log, LOG_TYPE, trim } from "../util/index";
import ExtractJS from "./extract-js";
import Extract from "./extract";
import parseComponent from "./vue/vue-compiler";
import parseHtml from "./vue/html-parser";

class ExtractVUE extends Extract {
  constructor(option) {
    super(option);

    this.extractJS = new ExtractJS({
      CONFIG_HONG: this.option.CONFIG_HONG,
      onlyZH: this.option.onlyZH,
      transWords: this.option.transWords,
      isTranslate: this.option.isTranslate
    });
  }

  transNode(content) {
    let sfc = (this.sfc = this.parseVue(content));

    return new Promise((resolve, reject) => {
      try {
        resolve(sfc);
      } catch (err) {
        reject(err);
      }
    });
  }

  parseVue(content) {
    return parseComponent(content);
  }

  scanNode(sfc) {
    if (sfc.template && sfc.template.content) {
      sfc.template.content = this.parseHtml(sfc.template.content);
    }
    if (sfc.script && sfc.script.content) {
      return this.handleJsTask(sfc.script.content).then(() => {
        return this.generate();
      });
    }
    return Promise.resolve(this.generate());
  }

  generate() {
    let content = "";
    if (this.option.isTranslate) {
      let sortKey = ["template", "script", "style", "customBlocks"];
      sortKey.forEach(key => {
        let item = this.sfc[key];
        if (!item) {
          return;
        }
        if (Array.isArray(item)) {
          item.forEach(style => {
            content += this.createTag(style);
          });
        } else {
          content += this.createTag(item);
        }
      });
    }
    return content;
  }

  createTag(option) {
    let content = "<";
    content += option.type;
    option.attrs.forEach(attr => {
      if (attr.value === "") {
        content += ` ${attr.name}`;
      } else {
        content += ` ${attr.name}="${attr.value}"`;
      }
    });
    content += ">";
    content += "\r\n";
    content += option.content.replace(/^\s*|\s*$/g, "");
    content += "\r\n";
    content += `</${option.type}>`;
    content += "\r\n\r\n";
    return content;
  }

  parseHtml(template) {
    if (template) {
      return parseHtml(template, this);
    }
  }

  handleJsTask(content) {
    return this.extractJS
      .transNode(content)
      .then(AST => {
        return this.extractJS.scanNode(AST);
      })
      .then(fileData => {
        this.sfc.script.content = fileData;
        this.addWords(this.extractJS.words);
        this.extractJS.words = [];
        return "done";
      })
      .catch(error => {
        console.log(error);
        log(`vue script处理出错- ${error}`, LOG_TYPE.error);
        return "done";
      });
  }
}

export default ExtractVUE;
