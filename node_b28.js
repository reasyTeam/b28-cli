const handle = require('./src/handle');
const { COMMAD, valid } = require('./src/util/config');

let cwd = process.cwd();
let configFilepath = path.join(cwd, 'b281.config.js');

//将命令和参数分离

function gerArgs() {
    let args = require('./libs/getOption')(process.argv.splice(2)),
        config;

    switch (+args.type) {
        case COMMAD.GET_WORDS:
            config = {
                commandType: 0,
                onlyZH: args.zh,
                baseReadPath: args.from,
                baseOutPath: args.to,
                hongPath: args.hong
            };
            break;
        case COMMAD.TRANSLATE:
            config = {
                commandType: 1,
                baseTranslatePath: args.from,
                baseTransOutPath: args.to,
                languagePath: args.lang,
                hongPath: args.hong,
                keyName: '',
                valueName: '',
                sheetName: ''
            };
            break;
        case COMMAD.CHECK_TRANSLATE:
            config = {
                commandType: 2,
                baseCheckPath: args.from,
                langJsonPath: args.lang,
                hongPath: args.hong,
                logPath: args.to
            };
            break;
        case COMMAD.EXCEL_TO_JSON:
            config = {
                commandType: 3,
                keyName: args.key,
                valueName: args.value,
                sheetName: args.sheet,
                excelPath: args.from,
                outJsonPath: args.to
            };
            break;
        case COMMAD.JSON_TO_EXCEL:
            config = {
                commandType: 4,
                jsonPath: args.from,
                outExcelPath: args.to
            };
            break;
        case COMMAD.MERGE_JSON:
            config = {
                commandType: 5,
                mainJsonPath: args.src1,
                mergeJsonPath: args.src2,
                outMergeJsonPath: args.dest
            };
            break;
    }
    return config;
}

function start(config) {
    if (config || fs.existsSync(configFilepath)) {
        console.log('读取配置···');
        config = config || require(configFilepath);

        return correctCfg(config);
    } else {
        return getCfg();
    }
}

function getCfg() {
    let type = 0;
    return inquirer.prompt(baseQuestions)
        .then(answers => {
            type = answers.commandType;
            return inquirer.prompt(questions[type]);
        })
        .then(answers => {
            answers.commandType = type;
            return answers;
        });
}

/**
 * 验证和修正所有配置参数
 */
function correctCfg(cfg) {
    if (cfg.commandType === undefined || cfg.commandType === '') {
        console.error('请选择您需要使用的功能！');
        return getCfg();
    }

    console.log(`您已选择[${COMMAD_TEXT[cfg.commandType]}]功能；`);

    let error = validate(cfg.commandType);

    if (error) {
        console.error('参数配置错误，请重新配置：');

        return inquirer.prompt(questions[type]).then(answers => {
            answers.commandType = cfg.commandType;
            return answers;
        });
    }

    return Promise.resolve(cfg);
}

let validate = {
    0: function(cfg) {
        if (valid.folder(cfg.baseReadPath) !== true) {
            return true;
        }

        cfg.baseOutPath = cfg.baseOutPath || getDirname(cfg.baseReadPath);
        if (valid.specialFolder(cfg.baseOutPath) !== true) {
            return true;
        }

        if (valid.specialfile(cfg.hongPath) !== true) {
            return true;
        }
    },
    1: function(cfg) {
        if (valid.folder(cfg.baseTranslatePath) !== true) {
            return true;
        }

        cfg.baseTransOutPath = cfg.baseTransOutPath || getDirname(cfg.baseTranslatePath);
        if (valid.specialFolder(cfg.baseTransOutPath) !== true) {
            return true;
        }

        if (valid.specialfile(cfg.hongPath) !== true) {
            return true;
        }

        if (valid.filePath(cfg.languagePath) !== true) {
            return true;
        }
    },
    2: function(cfg) {
        if (valid.folder(cfg.baseCheckPath) !== true) {
            return true;
        }

        cfg.logPath = cfg.logPath || getDirname(cfg.baseCheckPath);
        if (valid.specialFolder(cfg.logPath) !== true) {
            return true;
        }

        if (valid.specialfile(cfg.hongPath) !== true) {
            return true;
        }

        if (valid.filePath(cfg.langJsonPath) !== true) {
            return true;
        }
    },
    3: function(cfg) {
        if (valid.required(cfg.keyName) !== true) {
            return true;
        }
        if (valid.filePath(cfg.excelPath) !== true) {
            return true;
        }
        cfg.outJsonPath = cfg.outJsonPath || getDirname(cfg.excelPath);
        if (valid.specialFolder(cfg.outJsonPath) !== true) {
            return true;
        }
    },
    4: function(cfg) {
        if (valid.filePath(cfg.jsonPath) !== true) {
            return true;
        }
        cfg.outExcelPath = cfg.outExcelPath || getDirname(cfg.jsonPath);
        if (valid.specialFolder(cfg.outExcelPath) !== true) {
            return true;
        }
    },
    5: function(cfg) {
        if (valid.folder(cfg.baseJsonPath) !== true) {
            return true;
        }
        cfg.outMergeJsonPath = cfg.outMergeJsonPath || getDirname(cfg.baseJsonPath);
        if (valid.specialFolder(cfg.outMergeJsonPath) !== true) {
            return true;
        }
    }
}

function main() {
    let config = gerArgs();

    if (config) {
        start(config).then(data => {
            return handle(data);
        });
    }
}

main();