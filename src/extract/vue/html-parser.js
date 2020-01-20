import { parse } from "babylon";
import { makeMap, unicodeRegExp, no, chineseRE } from "./util";

const attribute = /^\s*([^\s"'<>\/=]+)(?:\s*(=)\s*(?:"([^"]*)"+|'([^']*)'+|([^\s"'=<>`]+)))?/;
const dynamicArgAttribute = /^\s*((?:v-[\w-]+:|@|:|#)\[[^=]+\][^\s"'<>\/=]*)(?:\s*(=)\s*(?:"([^"]*)"+|'([^']*)'+|([^\s"'=<>`]+)))?/;
const ncname = `[a-zA-Z_][\\-\\.0-9_a-zA-Z${unicodeRegExp.source}]*`;
const qnameCapture = `((?:${ncname}\\:)?${ncname})`;
const startTagOpen = new RegExp(`^<${qnameCapture}`);
const startTagClose = /^\s*(\/?)>/;
const endTag = new RegExp(`^<\\/${qnameCapture}[^>]*>`);
const doctype = /^<!DOCTYPE [^>]+>/i;
const comment = /^<!\--/;
const conditionalComment = /^<!\[/;

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
const bindRE = /^:|^v-bind:/;

const regexEscapeRE = /[-.*+?^${}()|[\]\/\\]/g;
const buildRegex = (delimiters, full) => {
  const open = delimiters[0].replace(regexEscapeRE, "\\$&");
  const close = delimiters[1].replace(regexEscapeRE, "\\$&");
  const reg = open + "((?:.|\\n)+?)" + close;
  return new RegExp(full ? `^${reg}$` : reg, "g");
};

const ignoreRE = [];

export function parseText(text, delimiters) {
  const tagRE = delimiters ? buildRegex(delimiters) : defaultTagRE;
  if (!tagRE.test(text)) {
    return;
  }
  const tokens = [];
  let lastIndex = (tagRE.lastIndex = 0);
  let match, index;
  while ((match = tagRE.exec(text))) {
    index = match.index;
    if (index > lastIndex) {
      tokens.push({
        value: text.slice(lastIndex, index),
        start: lastIndex,
        end: index
      });
    }

    const exp = match[1].trim();
    tokens.push({
      value: exp,
      directive: true,
      start: index + delimiters[0].length,
      end: index + delimiters[0].length + exp.length
    });
    lastIndex = index + match[0].length;
  }
  if (lastIndex < text.length) {
    tokens.push({
      value: text.slice(lastIndex),
      start: lastIndex,
      end: text.length
    });
  }
  return tokens;
}

function parseExp(tocken, offset = 0) {
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

  ast = ast.program.body;
  let tockens = [];
  ast.forEach(item => {
    if (typeof item === "object" && item.type === "ExpressionStatement") {
      tockens.push(...parseOperation(item.expression));
    }
  });
  return tockens;

  function parseOperation(ast) {
    let tockens = [];
    switch (ast.type) {
      case "BinaryExpression":
        while (ast.right) {
          tockens.unshift(...parseOperation(ast.right));
          ast = ast.left;
        }
        tockens.unshift(...parseOperation(ast));
        break;
      case "StringLiteral":
        tockens.push({
          start: ast.start + start,
          end: ast.end + start,
          value: ast.value
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
              start: ast.arguments[0].start + 1 + start,
              end: ast.arguments[0].end - 1 + start,
              value: ast.arguments[0].value
            });
          }
        } else {
          tockens.push({
            start: ast.start + start,
            end: ast.end + start,
            isArg: true
          });
        }
        break;
      case "ConditionalExpression":
        tockens.push(...parseOperation(ast.consequent));
        tockens.push(...parseOperation(ast.alternate));
        break;
      default:
        tockens.push({
          start: ast.start + start,
          end: ast.end + start,
          isArg: true
        });
    }
    return tockens;
  }
}

function listModuleTockens(tockens, text) {
  let outData = {
    args: [],
    text: "",
    isTrans: false,
    trans: []
  };
  for (let i = 0, l = tockens.length; i < l; i++) {
    let tocken = tockens[i];
    if (tocken.isTrans) {
      outData.isTrans = true;
      outData.trans.push({
        isTrans: true,
        start: tocken.start,
        end: tocken.end,
        value: tocken.value
      });
    } else {
      if (outData.isTrans) {
        continue;
      }
      if (tocken.isArg) {
        outData.args.push(text.slice(tocken.start, tocken.end));
        outData.text += "%s";
      } else {
        outData.text += tocken.value;
      }
    }
  }
  return outData;
}

function parseHTML(html, options) {
  let index = 0;
  let last, lastTag;
  while (html) {
    last = html;
    if (!lastTag || !isPlainTextElement(lastTag)) {
      let textEnd = html.indexOf("<");

      if (textEnd === 0) {
        if (comment.test(html)) {
          const commentEnd = html.indexOf("-->");

          if (commentEnd >= 0) {
            advance(commentEnd + 3);
            continue;
          }
        }

        if (conditionalComment.test(html)) {
          const conditionalEnd = html.indexOf("]>");

          if (conditionalEnd >= 0) {
            advance(conditionalEnd + 2);
            continue;
          }
        }

        const doctypeMatch = html.match(doctype);
        if (doctypeMatch) {
          advance(doctypeMatch[0].length);
          continue;
        }

        const endTagMatch = html.match(endTag);
        if (endTagMatch) {
          advance(endTagMatch[0].length);
          continue;
        }

        const startTagAttrs = parseStartTag();
        if (startTagAttrs) {
          if (startTagAttrs.length > 0) {
            options.start(startTagAttrs);
          }
          continue;
        }
      }

      let text, rest, next;
      if (textEnd >= 0) {
        rest = html.slice(textEnd);
        while (
          !endTag.test(rest) &&
          !startTagOpen.test(rest) &&
          !comment.test(rest) &&
          !conditionalComment.test(rest)
        ) {
          next = rest.indexOf("<", 1);
          if (next < 0) break;
          textEnd += next;
          rest = html.slice(textEnd);
        }
        text = html.substring(0, textEnd);
      }

      if (textEnd < 0) {
        text = html;
      }

      if (text) {
        advance(text.length);
      }

      if (options.chars && text) {
        options.chars(text, index - text.length, index);
      }
    } else {
      const stackedTag = lastTag.toLowerCase();
      const reStackedTag =
        reCache[stackedTag] ||
        (reCache[stackedTag] = new RegExp(
          "([\\s\\S]*?)(</" + stackedTag + "[^>]*>)",
          "i"
        ));
      const rest = html.replace(reStackedTag, function() {
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

  function advance(n) {
    index += n;
    html = html.substring(n);
  }

  function parseStartTag() {
    const start = html.match(startTagOpen);
    if (start) {
      advance(start[0].length);
      let attrs = [],
        end,
        attr;
      while (
        !(end = html.match(startTagClose)) &&
        (attr = html.match(dynamicArgAttribute) || html.match(attribute))
      ) {
        let start = index;
        advance(attr[0].length);
        let end = index;

        let name = attr[1],
          value = attr[3] || attr[4] || attr[5] || "";

        if (bindRE.test(name)) {
          attrs.push({
            name,
            value,
            start: start + attr[0].match(/^\s*/).length,
            end: end,
            directive: true
          });
        } else if (["placeholder", "title", "alt"].indexOf(name) !== -1) {
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

function parseTemplate(template, target) {
  let delimiters = target.option.delimiters || ["{{", "}}"];
  let langs = [];

  function getWord(text) {
    return target.getWord(text);
  }
  global.template = template;

  parseHTML(template, {
    start(attrs) {
      let word = "";
      attrs.forEach(attr => {
        if (attr.directive) {
          let offset = template.slice(attr.start, attr.end).indexOf(attr.value);
          let tockens = parseExp(attr, offset);
          let outData = listModuleTockens(tockens, attr.value);
          if (outData.isTrans) {
            outData.trans.forEach(item => {
              word = getWord(item.value);
              if (word && word !== item.value) {
                langs.push({
                  start: item.start,
                  end: item.end,
                  value: word
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
    chars(text, start, end) {
      if (!text.trim()) {
        return;
      }

      let tockens,
        textArr = [];

      if ((tockens = parseText(text, delimiters))) {
        tockens.forEach(tocken => {
          if (tocken.directive) {
            let asts = parseExp(tocken);
            textArr.push(listModuleTockens(asts, text));
          } else {
            textArr.push(tocken.value);
          }
        });

        let word = "",
          oldWord = "",
          args = [],
          hasTrans = false;

        for (let i = 0, l = textArr.length; i < l; i++) {
          let tocken = textArr[i];
          if (hasTrans && (typeof tocken !== "object" || !tocken.isTrans)) {
            continue;
          }
          if (typeof tocken === "string") {
            oldWord += tocken;
          } else {
            if (tocken.isTrans) {
              hasTrans = true;
              tocken.trans.forEach(item => {
                oldWord = item.value;
                let newStart = start + item.start;
                let newEnd = newStart + item.value.length;

                word = getWord(oldWord);
                if ((word = getWord(oldWord))) {
                  if (word !== oldWord) {
                    langs.push({
                      start: newStart,
                      end: newEnd,
                      value: word
                    });
                  }
                }
              });
            } else {
              args.push(...tocken.args);
              oldWord += tocken.text;
            }
          }
        }

        if (hasTrans) {
          return;
        }

        if (/^(%s)*$/.test(oldWord.replace(/^\s*|\s*$/g, ""))) {
          return;
        }

        let textNoArgs = oldWord.replace(/%s/g, "");
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
        let word = getWord(text);
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
    } else {
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
