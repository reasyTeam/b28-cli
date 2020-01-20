import { parse } from "babylon";
import generate from "babel-generator";
import Extract from "./extract";
import { TRANS_NAME_REGEX } from "../util/config";
import { chineseRE } from "./vue/util";
import { deepClone } from "../util/index";

const parseType = /^(CallExpression|StringLiteral)$/i;
let inTranslate = false;

class ExtractJs extends Extract {
  constructor(option) {
    super(option);
    this.leadingComment = "";
    this.tempNodes = [];
  }

  transNode(jsDoc) {
    return new Promise((resolve, reject) => {
      try {
        let AST = parse(jsDoc, {
          sourceType: "module",
          plugins: ["objectRestSpread"]
        });
        resolve(AST);
      } catch (err) {
        reject("文件转AST出错，无法转换！");
      }
    });
  }

  scanNode(AST, jsDoc) {
    return new Promise((resolve, reject) => {
      if (AST === "none") {
        resolve(jsDoc);
        return;
      }

      let body = AST.program.body;
      body.forEach(node => {
        this.listAst(node);
      });

      let data = generate(AST, {}, jsDoc).code;

      data = unescape(data.replace(/\\u/g, "%u"));
      resolve(data);
    });
  }

  getValue(nodeArgs) {
    if (nodeArgs) {
      if (nodeArgs.value !== undefined) {
        return nodeArgs.value;
      }

      let value = "",
        left = nodeArgs.left;

      while (left && left.right) {
        value += left.right.value;
        left = left.left;
      }

      value =
        (left ? left.value : "") +
        value +
        (nodeArgs.right ? nodeArgs.right.value : "");
      return value;
    }
    return "";
  }

  createFunAst(ast, word) {
    let stringAst = deepClone(ast);
    stringAst.value = word;
    ast.type = "CallExpression";
    delete ast.value;
    delete ast.extra;
    ast.callee = {
      type: "Identifier",
      name: "_"
    };
    ast.arguments = [stringAst];
  }

  listNode(node) {
    let curValue = "",
      oldVal = "";
    switch (node.type) {
      case "CallExpression":
        if (node.callee && node.callee.type === "Identifier") {
          if (
            TRANS_NAME_REGEX.test(node.callee.name) &&
            node.arguments.length > 0
          ) {
            let curNode = node.arguments[0];

            if (curNode.type === "StringLiteral") {
              oldVal = curNode.value;
              curValue = this.getWord(oldVal, true);
              if (curValue && curNode.value) {
                curNode.value = curValue;
              }
            } else {
              inTranslate = true;
              this.listAst(curNode);
              inTranslate = false;
            }

            if (node.arguments.length > 1) {
              this.listAst(Array.prototype.slice.call(node.arguments, 1));
            }
            return;
          }
        } else {
          this.listAst(node.callee);
        }
        this.listAst(node.arguments);
        break;
      case "StringLiteral":
        oldVal = node.value;
        if (chineseRE.test(oldVal)) {
          curValue = this.getWord(oldVal, true);
          if (curValue) {
            if (inTranslate) {
              node.value = curValue;
            } else {
              this.createFunAst(node, curValue);
            }
          }
        }
        break;
    }
  }

  listAst(astNode) {
    if (typeof astNode !== "object") {
      return;
    }

    let type = Object.prototype.toString.call(astNode);
    if (type === "[object Object]") {
      let leadingComment = this.leadingComment;
      if (astNode.leadingComments) {
        leadingComment = astNode.leadingComments[
          astNode.leadingComments.length - 1
        ]["value"].replace(/^\s*|\s*$/g, "");
        leadingComment =
          this.CONFIG_HONG[leadingComment] === false ? leadingComment : "";
        this.leadingComment = leadingComment;

        this.listTenpAst();
      }

      if (leadingComment) {
        if (astNode.trailingComments) {
          this.leadingComment = "";
          let trailingComment = astNode.trailingComments[0]["value"].replace(
            /^\s*|\s*$/g,
            ""
          );
          if (leadingComment === trailingComment) {
            this.tempNodes = [];
            return;
          } else {
            this.listTenpAst();
          }
        } else {
          this.tempNodes.push(astNode);
          return;
        }
      }

      if (parseType.test(astNode.type)) {
        this.listNode(astNode);
        return;
      }
      let ignoreKeys = ["leadingComments", "trailingComments", "loc", "key"];
      for (let key in astNode) {
        if (ignoreKeys.includes(key)) {
          continue;
        }
        this.listAst(astNode[key]);
      }
    } else if (type === "[object Array]") {
      astNode.forEach(node => {
        this.listAst(node);
      });
    }
  }

  listTenpAst() {
    this.tempNodes.forEach(item => {
      this.listAst(item);
    });
    this.tempNodes = [];
  }
}

export default ExtractJs;
