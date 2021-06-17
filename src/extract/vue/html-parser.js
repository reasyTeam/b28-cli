import { parse } from "babylon";
import { makeMap, unicodeRegExp, no, chineseRE } from "./util";

// Regular Expressions for parsing tags and attributes
const attribute =
  /^\s*([^\s"'<>\/=]+)(?:\s*(=)\s*(?:"([^"]*)"+|'([^']*)'+|([^\s"'=<>`]+)))?/;
const dynamicArgAttribute =
  /^\s*((?:v-[\w-]+:|@|:|#)\[[^=]+\][^\s"'<>\/=]*)(?:\s*(=)\s*(?:"([^"]*)"+|'([^']*)'+|([^\s"'=<>`]+)))?/;
const ncname = `[a-zA-Z_][\\-\\.0-9_a-zA-Z${unicodeRegExp.source}]*`;
const qnameCapture = `((?:${ncname}\\:)?${ncname})`;
// dom标签开始位置
const startTagOpen = new RegExp(`^<${qnameCapture}`);
// dom开始标签结束或自闭和标签结束位置，
const startTagClose = /^\s*(\/?)>/;
const endTag = new RegExp(`^<\\/${qnameCapture}[^>]*>`);
const doctype = /^<!DOCTYPE [^>]+>/i;

const comment = /^<!\--/;
const conditionalComment = /^<!\[/;

// Special Elements (can contain anything)
export const isPlainTextElement = makeMap("script,style,textarea", true);
const reCache = {};

const decodingMap = {
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&amp;": "&",
  "&#10;": "\n",
  "&#9;": "\t",
  "&#39;": "'"
};
const encodedAttr = /&(?:lt|gt|quot|amp|#39);/g;
const encodedAttrWithNewLines = /&(?:lt|gt|quot|amp|#39|#10|#9);/g;
const bindRE = /^:|^v-bind:|^v-html/;

const regexEscapeRE = /[-.*+?^${}()|[\]\/\\]/g;
const buildRegex = (delimiters, full) => {
  // $&: 插入匹配的子串
  const open = delimiters[0].replace(regexEscapeRE, "\\$&");
  const close = delimiters[1].replace(regexEscapeRE, "\\$&");
  // const reg = open + "((?:.|\\n)+?)" + close;
  const reg = open + "((?:.|(?:\\r)?\\n)+?)" + close;
  return new RegExp(full ? `^${reg}$` : reg, "g");
};

const ignoreRE = [];

/**
 * 解析字符串表达式，拆解成多个部分
 * 比如：<label>在线用户（{{ online }}人）</label>
 * 解析成三部分：在线用户（，{{online}}，人）
 */
export function parseText(
  text,
  delimiters // 纯文本插入分隔符。默认为["{{", "}}"]
) {
  // 根据自定义分隔符适配匹配正则
  const tagRE = delimiters ? buildRegex(delimiters) : defaultTagRE;
  if (!tagRE.test(text)) {
    return {};
  }
  // 文本 + 命令
  const tockens = [];
  // 指定下一次匹配的起始索引
  let lastIndex = (tagRE.lastIndex = 0);
  let match, index;
  let needMerge = false;
  while ((match = tagRE.exec(text))) {
    index = match.index;
    // push text token
    if (index > lastIndex && /[^\s]/.test(text.slice(lastIndex, index))) {
      needMerge = true;
      tockens.push({
        value: text.slice(lastIndex, index),
        start: lastIndex,
        end: index
      });
    }
    // tag token

    let startEmptyLength = /^\s*/g.exec(match[1])[0].length;
    const exp = match[1].trim();
    tockens.push({
      value: exp,
      directive: true,
      start: index + startEmptyLength + delimiters[0].length,
      end: index + startEmptyLength + delimiters[0].length + exp.length
    });
    lastIndex = index + match[0].length;
  }
  if (lastIndex < text.length && /[^\s]/.test(text.slice(lastIndex))) {
    needMerge = true;
    tockens.push({
      value: text.slice(lastIndex),
      start: lastIndex,
      end: text.length
    });
  }
  return { tockens, needMerge };
}

/**
 * 解析{{}}指令内部的表达式
 */
function parseExp(tocken, offset = 0, needMerge = false) {
  let ast,
    start = tocken.start + offset;

  try {
    ast = parse(tocken.value, {
      sourceType: "module",
      plugins: ["objectRestSpread"]
    });
  } catch (err) {
    return [];
  }

  ast = ast.program;
  ast = ast.body.length === 0 ? ast.directives : ast.body;

  let tockens = [];
  ast.forEach(item => {
    if (typeof item === "object") {
      if (item.type === "ExpressionStatement") {
        tockens.push(...parseOperation(item.expression));
      } else if (item.type === "Directive") {
        tockens.push(...parseOperation(item.value));
      }
    }
  });
  return tockens;

  function parseOperation(ast) {
    let tockens = [];
    switch (ast.type) {
      case "BinaryExpression":
        if (ast.operator !== "+") {
          tockens.push({
            start: ast.start + start,
            end: ast.end + start,
            astStart: ast.start,
            astEnd: ast.end,
            // 是否解析成翻译函数的参数部分
            isArg: true,
            needMerge
          });
          break;
        }
        needMerge = true;
        while (ast.right) {
          tockens.unshift(...parseOperation(ast.right));
          ast = ast.left;
        }
        tockens.unshift(...parseOperation(ast));
        break;
      case "DirectiveLiteral":
      case "StringLiteral":
        tockens.push({
          start: ast.start + start,
          end: ast.end + start,
          astStart: ast.start,
          astEnd: ast.end,
          value: ast.value,
          type: "string",
          needMerge
        });
        break;
      case "CallExpression":
        if (ast.callee.name === "_") {
          if (
            ast.arguments.length > 0 &&
            ast.arguments[0].type === "StringLiteral"
          ) {
            tockens.push({
              isTrans: true,
              astStart: ast.arguments[0].start + 1,
              astEnd: ast.arguments[0].end - 1,
              start: ast.arguments[0].start + 1 + start,
              end: ast.arguments[0].end - 1 + start,
              value: ast.arguments[0].value
            });

            // 解析参数
            if (ast.arguments.length > 1) {
              for (let i = 1; i < ast.arguments.length; i++) {
                tockens.push(...parseOperation(ast.arguments[i]));
              }
            }
          }
        } else {
          tockens.push({
            start: ast.start + start,
            end: ast.end + start,
            isArg: true,
            needMerge
          });
        }
        break;
      case "ConditionalExpression":
        let left = parseOperation(ast.consequent);
        let right = parseOperation(ast.alternate);
        if (needMerge) {
          tockens.push({
            start: ast.start + start,
            end: ast.end + start,
            isArg: true,
            needMerge,
            tockens: [...left, ...right]
          });
        } else {
          tockens.push(...left);
          tockens.push(...right);
        }
        break;
      case "ArrayExpression":
        ast.elements.forEach(item => {
          tockens.push(...parseOperation(item));
        });
        break;
      default:
        tockens.push({
          start: ast.start + start,
          end: ast.end + start,
          isArg: true,
          needMerge
        });
    }

    return tockens;
  }
}

/**
 * 解析parseExp的结果，即{{}}模板表达式内的ast，提取词条或者合并词条
 * 如果文本中存在翻译函数，则直接处理翻译函数，其它词条文本会被处理，但是不会进行任何的参数合并操作，只处理词条
 */
function listModuleTockens(tockens, text) {
  let outData = {
    args: [],
    text: "",
    isTrans: false,
    trans: []
  };
  for (let i = 0, l = tockens.length; i < l; i++) {
    let tocken = tockens[i];

    // 如果当前语法段是翻译函数，则直接处理
    if (tocken.isTrans) {
      outData.isTrans = true;
      outData.trans.push({
        isTrans: true,
        start: tocken.start,
        end: tocken.end,
        value: tocken.value
      });
    } else {
      // 当前表达式中已包含翻译函数，则剩下的词条只做提取或翻译处理
      if (outData.isTrans) {
        tocken.value &&
          outData.trans.push({
            isTrans: tocken.isTrans,
            start: tocken.start,
            end: tocken.end,
            value: tocken.value
          });
        continue;
      }
      // 当前表达式中不包含任何翻译函数
      // 如果当前子表达式是用作翻译函数的参数
      if (tocken.isArg) {
        tocken.valueText = text.slice(tocken.start, tocken.end);
        outData.args.push(tocken);
        // 处理args里面的
        outData.text += "%s";
      } else {
        // 当前表达式需要合并
        if (tocken.needMerge) {
          outData.text += tocken.value;
        } else {
          // 其它情况
          tocken.value &&
            outData.trans.push({
              isTrans: tocken.isTrans,
              start: tocken.start,
              end: tocken.end,
              value: tocken.value
            });
        }
      }
    }
  }

  return outData;
}

// html 解析
function parseHTML(html, options) {
  let index = 0;
  // 记录当前解析的标签名
  let last, lastTag;
  while (html) {
    last = html;
    if (!lastTag || !isPlainTextElement(lastTag)) {
      let textEnd = html.indexOf("<");

      // 如果textEnd不为0，则从html开始位置到textEnd位置都是文本
      if (textEnd === 0) {
        // Comment: 注释节点，前进
        if (comment.test(html)) {
          const commentEnd = html.indexOf("-->");

          if (commentEnd >= 0) {
            advance(commentEnd + 3);
            continue;
          }
        }

        // 条件注释，直接跳过
        if (conditionalComment.test(html)) {
          const conditionalEnd = html.indexOf("]>");

          if (conditionalEnd >= 0) {
            advance(conditionalEnd + 2);
            continue;
          }
        }

        // Doctype申明，直接跳过
        const doctypeMatch = html.match(doctype);
        if (doctypeMatch) {
          advance(doctypeMatch[0].length);
          continue;
        }

        // End tag:
        const endTagMatch = html.match(endTag);
        if (endTagMatch) {
          advance(endTagMatch[0].length);
          continue;
        }

        // Start tag:
        // 解析开始标签[<xxx]到开始标签结束标记[>或/>]之间的内容，输出match
        // 例如<div id="xx" :data1="data1"> 或者<input type="text"/>
        const startTagAttrs = parseStartTag();
        if (startTagAttrs) {
          if (startTagAttrs.length > 0) {
            options.start(startTagAttrs);
          }
          continue;
        }
      }

      // 从当前位置到 textEnd 位置都是文本
      let text, rest, next;
      if (textEnd >= 0) {
        // 从textEnd开始截取，包括textEnd
        rest = html.slice(textEnd);
        while (
          !endTag.test(rest) &&
          !startTagOpen.test(rest) &&
          !comment.test(rest) &&
          !conditionalComment.test(rest)
        ) {
          // 当从<开始的位置进行匹配，匹配不到注释、开始或结束标签时，将<归为text的一部分
          next = rest.indexOf("<", 1);
          if (next < 0) break;
          textEnd += next;
          rest = html.slice(textEnd);
        }
        // 截取整个文本，可能包括不是开始或结束标签或者注释标签的<
        text = html.substring(0, textEnd);
      }

      // 不存在<，则表示为纯文本
      if (textEnd < 0) {
        text = html;
      }

      // 截断文本，递归剩余的字符串
      if (text) {
        advance(text.length);
      }

      if (options.chars && text) {
        options.chars(text, index - text.length, index);
      }
    } else {
      // 处理script、style、textarea
      const stackedTag = lastTag.toLowerCase();
      const reStackedTag =
        reCache[stackedTag] ||
        (reCache[stackedTag] = new RegExp(
          "([\\s\\S]*?)(</" + stackedTag + "[^>]*>)",
          "i"
        ));
      const rest = html.replace(reStackedTag, function () {
        return "";
      });
      index += html.length - rest.length;
      html = rest;
    }

    if (html === last) {
      options.chars && options.chars(html);
      break;
    }
  }

  /**
   * 从位置index + n处开始截断html
   */
  function advance(n) {
    index += n;
    html = html.substring(n);
  }

  /**
   * 解析开始标签[<xxx]到结束标签[>或/>]的内容，输出match
   * 只记录需要处理的attr
   */
  function parseStartTag() {
    const start = html.match(startTagOpen);
    if (start) {
      // html剔除匹配的html
      advance(start[0].length);
      let attrs = [],
        end,
        attr;
      // 当前html的起始位置不是一元标签结束标签，并且有设置html属性
      while (
        !(end = html.match(startTagClose)) &&
        (attr = html.match(dynamicArgAttribute) || html.match(attribute))
      ) {
        let start = index;
        advance(attr[0].length);
        let end = index;

        let name = attr[1],
          value = attr[3] || attr[4] || attr[5] || "";

        if (bindRE.test(name) || /_\(/.test(value)) {
          attrs.push({
            name,
            value,
            start: start + attr[0].match(/^\s*/).length,
            end: end,
            directive: true
          });
        } else {
          // else if (["placeholder", "title", "alt"].indexOf(name) !== -1) {
          attrs.push({
            name,
            value,
            start: start + attr[0].match(/^\s*/).length,
            end: end
          });
        }
      }

      if (end) {
        advance(end[0].length);
      }
      return attrs;
    }
  }
}

// 处理表达式中最后设为arg的部分
function handleArgs(args) {
  return args.map(item => {
    let text = item.valueText,
      word = "";
    if (item.tockens) {
      let offset = 0;
      item.tockens.forEach(tocken => {
        if (tocken.type === "string") {
          word = getWord(tocken.value);
          if (word) {
            let v = `_('${word.replace(/'/, "\\'")}')`;
            text = text.splice(
              tocken.astStart + offset,
              tocken.astEnd + offset,
              v
            );
            offset = v.length - tocken.astEnd + tocken.astStart;
          }
        } else if (tocken.isTrans) {
          word = getWord(tocken.value);
          if (word) {
            let v = word.replace(/'/g, "\\'").replace(/"/g, '\\"');
            text = text.splice(
              tocken.astStart + offset,
              tocken.astEnd + offset,
              v
            );
            offset = v.length - tocken.astEnd + tocken.astStart;
          }
        }
      });
    }
    return text;
  });
}

function getWord() {}

/**
 * html转AST，记录词条的位置信息
 */
function parseTemplate(template, target) {
  // vue {{}}分隔符
  let delimiters = target.option.delimiters || ["{{", "}}"];
  // 存储词条相关内容，供翻译的时候直接添加翻译函数
  let langs = [];

  getWord = function (text) {
    return target.getWord(text);
  };
  global.template = template;

  parseHTML(template, {
    start(attrs) {
      let word = "";
      attrs.forEach(attr => {
        // 指令默认已添加翻译函数，未添加翻译函数代表不提取
        if (attr.directive) {
          // value的偏移量，计算value的ast时，start index需要偏移到value的起始位置
          let offset = template.slice(attr.start, attr.end).indexOf(attr.value);
          let tockens = parseExp(attr, offset);
          let outData = listModuleTockens(tockens, attr.value);
          // 对于v-bind指令，只有当指令内容包含翻译函数时才会进行处理，其它情况不进行处理
          if (outData.isTrans) {
            outData.trans.forEach(item => {
              word = "";
              if (item.isTrans) {
                word = getWord(item.value);
              } else if (item.type === "string" || chineseRE.test(item.value)) {
                word = getWord(item.value);
              }

              if (word && word !== item.value) {
                langs.push({
                  start: item.start,
                  end: item.end,
                  value: word,
                  needTrans: !item.isTrans
                });
              }
            });
          }
        } else {
          if (chineseRE.test(attr.value)) {
            word = getWord(attr.value);
            if (word && word !== attr.value) {
              langs.push({
                start: attr.start,
                end: attr.end,
                value: word,
                name: attr.name,
                needBind: true
              });
            }
          }
        }
      });
    },
    // 处理文本元素textnode
    chars(text, start, end) {
      if (!text.trim()) {
        return;
      }

      // 文本直接添加，指令则为对象
      let textArr = [];
      let { tockens, needMerge } = parseText(text, delimiters);

      // 文本内容中包含指令
      if (tockens) {
        // 解析指令表达式转成AST
        tockens.forEach(tocken => {
          if (tocken.directive) {
            let asts = parseExp(tocken, 0, needMerge);
            textArr.push(listModuleTockens(asts, text));
          } else {
            textArr.push(tocken.value);
          }
        });

        let word = "",
          oldWord = "",
          args = [],
          hasTrans = false;

        // 解析指令ast和字符串，输出最终的翻译表达式
        for (let i = 0, l = textArr.length; i < l; i++) {
          let tocken = textArr[i];
          if (hasTrans && (typeof tocken !== "object" || !tocken.isTrans)) {
            continue;
          }
          if (typeof tocken === "string") {
            oldWord += tocken;
          } else {
            // 如果文本中存在翻译函数，则直接处理翻译函数，其它文本忽略
            tocken.trans.forEach(item => {
              word = "";
              let newStart = start + item.start;
              let newEnd = newStart + item.end - item.start;
              if (item.isTrans) {
                word = getWord(item.value);
              } else if (item.type === "string" || chineseRE.test(item.value)) {
                word = getWord(item.value);
              }

              if (word && word !== item.value) {
                langs.push({
                  start: newStart,
                  end: newEnd,
                  value: word,
                  needTrans: !item.isTrans
                });
              }
            });

            if (tocken.isTrans) {
              hasTrans = true;
            } else if (tocken.text) {
              args.push(...handleArgs(tocken.args));
              oldWord += tocken.text;
            }
          }
        }

        if (hasTrans) {
          return;
        }

        // 如果只包含空格换行和%s则不作任何处理
        if (oldWord.replace(/\s|%s/g, "") === "") {
          return;
        }

        let textNoArgs = oldWord.replace(/%s/g, "");
        // 如果只有%s和空格符号等组成的词条，不做处理
        if (!/[a-z]/i.test(textNoArgs) && !chineseRE.test(textNoArgs)) {
          return;
        }

        if ((word = getWord(oldWord))) {
          word =
            args.length > 0
              ? `_('${word.replace(/'/, "\\'")}', [${args.join(", ")}])`
              : `_('${word.replace(/'/, "\\'")}')`;
          word = `${delimiters[0]}${word}${delimiters[1]}`;
          if (word !== text) {
            langs.push({
              start,
              end,
              value: word
            });
          }
        }
      } else if (chineseRE.test(text)) {
        // 纯文本内容
        let word = getWord(text);
        // word不为空则表示添加翻译
        if (word) {
          langs.push({
            start,
            end,
            value: `${delimiters[0]}_('${word.replace(/'/, "\\'")}')${
              delimiters[1]
            }`
          });
        }
      }
    }
  });

  let offset = 0;
  langs.forEach(item => {
    if (process.env.NODE_ENV === "dev") {
      console.log(
        `[test:][${template.slice(item.start + offset, item.end + offset)}]`
      );
    }
    if (item.name && item.needBind) {
      let attrText = `:${item.name}="_('${item.value}')"`;
      replace(item.start, item.end, attrText);
    } else if (item.needTrans) {
      let attrText = `_('${item.value}')`;
      replace(item.start, item.end, attrText);
    } else {
      // html节点内容文本
      replace(item.start, item.end, item.value);
    }
  });

  return template;

  function replace(start, end, value) {
    template = template.splice(start + offset, end + offset, value);
    offset += value.length - end + start;
  }
}

export default parseTemplate;
