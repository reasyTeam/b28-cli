import path from "path";
import fs from "fs";

import { getDirname } from "./index";

const CONFIG_FILE_NAME = "b28.config.js";

const TRANS_NAME_REGEX = /^_$/;

const COMMAD = {
  GET_WORDS: 0,
  TRANSLATE: 1,
  CHECK_TRANSLATE: 2,
  EXCEL_TO_JSON: 3,
  JSON_TO_EXCEL: 4,
  MERGE_JSON: 5,
  ORIGINAL_CODE: 6,
  GET_ALLWORDS: 7,
  CHECK_LANGEXCEL: 8,
  TRANS_ENCODE: 9
};

const COMMAD_TEXT = [
  "提取词条",
  "翻译文件",
  "翻译检查",
  "Excel转JSON",
  "JSON转Excel",
  "JSON合并",
  "添加翻译",
  "提取翻译",
  "翻译文件检查",
  "文件转码"
];

const valid = {
  specialfile(val) {
    val = val || "";
    val = val.replace(/(^\s*)|(\s*$)/g, "");
    if (val === "") {
      return true;
    }

    return valid.existFile(val);
  },
  folder(val) {
    val = val || "";
    val = val.replace(/(^\s*)|(\s*$)/g, "");
    if (val === "") {
      return "必填";
    }
    if (!path.isAbsolute(val)) {
      val = path.resolve(process.cwd(), val);
    }
    if (!fs.existsSync(val)) {
      return "请输入有效的地址";
    }
    return true;
  },
  existFile(val) {
    val = val || "";
    val = val.replace(/(^\s*)|(\s*$)/g, "");
    if (val === "") {
      return "必填";
    }

    if (!path.isAbsolute(val)) {
      val = path.resolve(process.cwd(), val);
    }
    if (path.extname(val) === "" || !fs.existsSync(val)) {
      return "请输入有效的文件地址";
    }
    return true;
  }
};

const baseQuestions = [
    {
      type: "list",
      name: "commandType",
      message: "当前执行的操作是：",
      choices: COMMAD_TEXT,
      filter: function(val) {
        return COMMAD_TEXT.indexOf(val);
      },
      pageSize: 9
    }
  ],
  questions = [
    [
      {
        type: "confirm",
        name: "onlyZH",
        message: "只提取中文？"
      },
      {
        type: "input",
        name: "baseReadPath",
        message: "待提取文件地址：",
        validate: valid.folder
      },
      {
        type: "input",
        name: "baseOutPath",
        message: "提取的Excel文件输出地址：",
        default(answers) {
          return getDirname(answers.baseReadPath);
        }
      },
      {
        type: "input",
        name: "hongPath",
        message: "宏文件地址：",
        default: "",
        validate: valid.specialfile
      }
    ],
    [
      {
        type: "input",
        name: "baseTranslatePath",
        message: "待翻译文件根目录：",
        validate: valid.folder
      },
      {
        type: "input",
        name: "baseTransOutPath",
        message: "翻译后文件输出根目录：",
        default(answers) {
          return getDirname(answers.baseTranslatePath);
        }
      },
      {
        type: "input",
        name: "hongPath",
        message: "宏文件地址：",
        default: "",
        validate: valid.specialfile
      },
      {
        type: "input",
        name: "languagePath",
        message: "语言包文件地址：",
        validate: valid.existFile
      },
      {
        type: "input",
        name: "sheetName",
        message: "Excel中对应的sheet：",
        default: "",
        when(answers) {
          return path.extname(answers.languagePath) !== ".json";
        }
      },
      {
        type: "input",
        name: "keyName",
        message: "key对应列：",
        default: "EN",
        when(answers) {
          return path.extname(answers.languagePath) !== ".json";
        }
      },
      {
        type: "input",
        name: "valueName",
        message: "value对应列：",
        default: "CN",
        when(answers) {
          return path.extname(answers.languagePath) !== ".json";
        }
      }
    ],
    [
      {
        type: "input",
        name: "baseCheckPath",
        message: "待检查文件根目录：",
        validate: valid.folder
      },
      {
        type: "input",
        name: "langJsonPath",
        message: "语言包json文件地址：",
        validate: valid.existFile
      },
      {
        type: "input",
        name: "hongPath",
        message: "宏文件地址：",
        validate: valid.specialfile
      },
      {
        type: "input",
        name: "logPath",
        message: "检查信息输出路径：",
        default(answers) {
          return getDirname(answers.baseCheckPath);
        }
      }
    ],
    [
      {
        type: "input",
        name: "excelPath",
        message: "Excel文件地址：",
        validate: valid.existFile
      },
      {
        type: "input",
        name: "sheetName",
        message: "Excel中对应的sheet：",
        default: ""
      },
      {
        type: "input",
        name: "keyName",
        message: "key对应列：",
        default: "EN"
      },
      {
        type: "input",
        name: "valueName",
        message: "value对应列：",
        default: ""
      },
      {
        type: "input",
        name: "outJsonPath",
        message: "输出json文件目录：",
        default(answers) {
          return getDirname(answers.excelPath);
        }
      }
    ],
    [
      {
        type: "input",
        name: "jsonPath",
        message: "json文件地址：",
        validate: valid.existFile
      },
      {
        type: "input",
        name: "outExcelPath",
        message: "输出Excel文件目录：",
        default(answers) {
          return getDirname(answers.jsonPath);
        }
      }
    ],
    [
      {
        type: "input",
        name: "mainJsonPath",
        message: "主json文件地址：",
        validate: valid.existFile
      },
      {
        type: "input",
        name: "mergeJsonPath",
        message: "次json文件地址：",
        validate: valid.existFile
      },
      {
        type: "input",
        name: "outMergeJsonPath",
        message: "合并后输出的地址：",
        default(answers) {
          return getDirname(answers.mainJsonPath);
        }
      }
    ],
    [
      {
        type: "input",
        name: "baseProPath",
        message: "原厂代码地址：",
        validate: valid.folder
      },
      {
        type: "input",
        name: "baseProOutPath",
        message: "添加翻译函数后文件输出地址：",
        default(answers) {
          return getDirname(answers.baseProPath);
        }
      },
      {
        type: "input",
        name: "ignoreCode",
        message: "需要注释的代码正则："
      },
      {
        type: "input",
        name: "templateExp",
        message: "后台插入表达式正则："
      }
    ],
    [
      {
        type: "input",
        name: "baseReadPath",
        message: "待提取文件地址：",
        validate: valid.folder
      },
      {
        type: "input",
        name: "languagePath",
        message: "语言包文地址（文件夹）：",
        validate: valid.folder
      },
      {
        type: "input",
        name: "baseOutPath",
        message: "提取的Excel文件输出地址：",
        default(answers) {
          return getDirname(answers.baseReadPath);
        },
        valid: valid.specialfile
      },
      {
        type: "input",
        name: "hongPath",
        message: "宏文件地址：",
        default: "",
        validate: valid.specialfile
      }
    ],
    [
      {
        type: "input",
        name: "outExcel",
        message: "输出的excel文件地址:",
        validate: valid.existFile
      },
      {
        type: "input",
        name: "sheetName1",
        message: "Excel中对应的sheet：",
        default: ""
      },
      {
        type: "input",
        name: "keyName1",
        message: "key对应列：",
        default: "EN"
      },
      {
        type: "input",
        name: "inExcel",
        message: "最终的语言包excel文件:",
        validate: valid.existFile
      },
      {
        type: "input",
        name: "sheetName2",
        message: "Excel中对应的sheet：",
        default: ""
      },
      {
        type: "input",
        name: "keyName2",
        message: "key对应列：",
        default: "EN"
      }
    ],
    [
      {
        type: "input",
        name: "transFilePath",
        message: "待转码文件地址",
        validate: valid.existFile
      },
      {
        type: "input",
        name: "transOutPath",
        message: "转码后文件输出地址",
        default: ""
      },
      {
        type: "input",
        name: "transEncode",
        message: "转码后文件的编码方式(默认UTF-8)",
        default: "utf-8"
      }
    ]
  ];

const EXCLUDE_FILE =
  "**/{img,images,lang,b28,goform,cgi-bin,css,OEM_CONFIG}/**";
const EXCLUDE_FILE_END =
  "**/{img,lang,b28,goform,cgi-bin,*.min.js,*shiv.js,*respond.js,*shim.js,.gitignore,.pidTmp,*.css,*.jpg,*.png,*.gif,*.bat,*.cgi}";
const EXTNAME_JS = "**/*.js";
const EXTNAME_VUE = "**/*.vue";
const EXTNAME_JSX = "**/*.jsx";
const EXTNAME_HTML = "**/{*.aspx,*.asp,*.ejs,*.html,*.htm}";
const TRANS_EXCLUDE =
  "**/{*.min.js,*shiv.js,*respond.js,*shim.js,.gitignore,.pidTmp,*.css,*.jpg,*.jpeg,*.png,*.gif,*.bat,*.cgi}";

const IGNORE_REGEXP = [
  /^[a-z]*[0-9]+[a-z]*$/i,
  /^[a-z]$/i,
  /^(mac|ip|TPC|QVLAN|VLAN|SSID|PPPoE|WPA|WPA2|WPA2-PSK|WPA-PSK|WEP|TKIP|AES|TKIP&AES|N\/A|mBPS|KB\/s|ping|UPnP|ASCII|hex|APSD|)$/i,
  /<%([\s\S]*)%>/i,
  /\(\[([\s\S]*)\]\)/i,
  /^(&nbsp;)+$/i,
  /[a-z0-9]*&[a-z]*=/i,
  /^(\s*<\s*\/([a-z0-9]+)?>\s*)*$/i,
  /^((ht|f)tps?):\/\/([\w\-]+(\.[\w\-]+)*\/)*[\w\-]+(\.[\w\-]+)*\/?(\?([\w\-\.,@?^=%&:\/~\+#]*)+)?/i
];
const IGNORE_WORDS = ["none", "visible", "display", "block"];
const IGNORE_FUNCTIONS = [
  function word(str) {
    if (/[^a-z]/i.test(str)) {
      return false;
    }

    if (IGNORE_WORDS.includes(str)) {
      return true;
    }

    if (/^[A-Z]+$/.test(str)) {
      return true;
    }

    return false;
  },
  function specialWord(str) {
    if (
      /^(([a-z]+[0-9\.,\?\\_\:\-/&\=<>\[\]\(\)\|]+)|([0-9\.,\?\\_\:\-/&\=<>\[\]\(\)\|]+[a-z]+))[a-z0-9\.,\?\\_\:\-/&\=<>\[\]\(\)\|]*$/i.test(
        str
      )
    ) {
      if (!/[0-9\=\?]/.test(str)) {
        return false;
      }
      return true;
    }
    return false;
  }
];

const ACTION_TYPE = {
  ADDTRANS: 1,
  GETLANG: 2,
  TRANSLATE: 3
};

export {
  EXCLUDE_FILE,
  EXCLUDE_FILE_END,
  TRANS_EXCLUDE,
  CONFIG_FILE_NAME,
  TRANS_NAME_REGEX,
  COMMAD,
  COMMAD_TEXT,
  questions,
  valid,
  EXTNAME_HTML,
  EXTNAME_JS,
  EXTNAME_VUE,
  baseQuestions,
  IGNORE_REGEXP,
  IGNORE_FUNCTIONS,
  ACTION_TYPE
};
