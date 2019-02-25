const LOG_TYPE = {
    warning: 1,
    error: 2,
    log: 3
};

const fs = require('fs');
const path = require('path');
const xlsx = require('node-xlsx').default;

/**
 * 对字符串重新编码，字符串前面加上8位的特殊编码
 * @param {String} key 需要进行重新编码的字符串 
 */
function formatKey(key) {
    let arr = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'],
        code = '{0}#{1}{2}{3}#',
        l = arr.length;

    key = decodeKey(key);
    return code.replace(/\{0\}/g, arr[Math.floor(Math.random() * l)]).replace(/\{1\}/g, arr[Math.floor(Math.random() * l)]).replace(/\{2\}/g, arr[Math.floor(Math.random() * l)]).replace(/\{3\}/g, arr[Math.floor(Math.random() * l)]) + key;
}

/**
 * 对重新编码的字符串进行解码
 * @param {String} key 需要解码的字符串
 */
function decodeKey(key) {
    if (!key) {
        return '';
    }

    return key.replace(/^[a-zA-Z]\#[a-zA-Z][a-zA-Z][a-zA-Z]\#/g, '');
}

function getDirname(filePath) {
    if (path.extname(filePath) !== '') {
        return path.dirname(filePath);
    }
    return filePath;
}

/**
 * 异步加载json文件
 * 返回Promise，
 * @param {String} src 文件绝对路径
 */
function loadFile(src) {
    return new Promise((resolve, reject) => {
        fs.readFile(src, 'utf8', (err, data) => {
            if (err) {
                reject(err);
                return;
            }

            resolve(data);
        });
    });
}

/**
 * 异步加载json文件
 * 返回Promise，参数为Object
 * @param {String} src 文件绝对路径
 */
function loadJson(src) {
    return loadFile(src).then((data) => {
        return JSON.parse(data);
    }).catch(err => {
        log(err.error, LOG_TYPE.error);
        return {};
    });
}

/**
 * 同步加载json文件
 * 返回Promise，参数为Object
 * @param {String} src 文件绝对路径
 */
function loadJsonSync(src) {
    try {
        return JSON.parse(fs.readFileSync(src));
    } catch (e) {
        return {};
    }
}

function writeJson(data, outPath) {
    createFolder(path.dirname(outPath));
    return new Promise((resolve, reject) => {
        fs.writeFile(outPath, JSON.stringify(data, '', 2), (err) => {
            if (err) {
                reject(err);
                return;
            }
            resolve(data);
        });
    });
}


/**
 * 不同类型的日志打印
 * @param {String} message 日志信息
 * @param {Number} type 日志类型
 */
function log(message, type) {
    switch (type) {
        case LOG_TYPE.warning:
            console.warn(message);
            break;
        case LOG_TYPE.error:
            console.error(message);
            break;
        default:
            console.log(message);
    }
}

/**
 * 读取excel
 * @param {String} xlsxPath excel文件地址
 */
function loadExcel(xlsxPath, sheetName) {
    let data = xlsx.parse(xlsxPath);
    let outData = [];
    // 当前只读取第一个sheet里面的内容
    data.forEach(item => {
        if (sheetName) {
            if (item.name === sheetName) {
                outData = item.data;
                return false;
            }
            outData = [];
        } else {
            outData = item.data;
            return false;
        }
    });
    outData = outData.filter(item => item.length > 0);
    return outData;
}

/**
 * 
 * @param {Array} data 写入excel中的数据    
 * @param {String} outPath 导出的excel文件名+地址(绝对路径)
 */
function writeExcel(data, outPath, sheetName) {
    console.log(1);
    createFolder(path.dirname(outPath));
    if (data && data.length > 0 && typeof data[0] !== 'object') {
        data = data.map(item => [item]);
    }

    let buffer = xlsx.build([{
        name: sheetName || '语言包',
        data: data
    }]);

    return new Promise((resolve, reject) => {
        fs.writeFile(outPath, buffer, (err) => {
            if (err) {
                reject(err);
                return;
            }
            resolve();
        });
    });
}

function writeTextFile(filename, content) { //以文本形式写入
    createFolder(path.dirname(filename));
    fs.writeFileSync(filename, content);
}

function createFolder(folder) {
    folder = path.resolve(folder);
    var originDir = folder;
    try {
        if (fs.existsSync(folder)) return;

        while (!fs.existsSync(folder + '/..')) { //检查父目录是否存在
            folder += '/..';
        }

        while (originDir.length <= folder.length) { //如果目录循环创建完毕，则跳出循环
            fs.mkdirSync(folder, '0777');
            folder = folder.substring(0, folder.length - 3);
        }
    } catch (e) {
        console.log(e);
    }
}

/**
 * 深度合并
 * @param {Object} oldObj 被合并对象
 * @param {Object} newObj 合并对象 
 */
function deepMerge(oldObj, newObj) {
    for (let key in newObj) {
        if (newObj.hasOwnProperty(key)) {
            let oldT = oldObj[key],
                newT = newObj[key];

            if (oldT) {
                if (Object.prototype.toString.call(newT) === '[object Object]') {
                    deepMerge(oldT, newT);
                } else {
                    oldObj[key] = newT;
                }
            } else {
                oldObj[key] = newT;
            }
        }
    }
}

function mergeObject(main, other) {
    if (Object.prototype.toString.call(main) === '[object Array]') {
        return [...new Set(main.concat(other))];
    }

    for (let key in other) {
        let data = other[key];
        if (main[key] !== undefined && typeof main[key] === 'object' && typeof data === 'object') {
            main[key] = mergeObject(main[key], data);
        } else {
            main[key] = data;
        }
    }

    return main;
}

/**
 * 扫描文件夹内的文件
 */
function scanFolder(folder) {
    var fileList = [],
        folderList = [],
        walk = function(folder, fileList, folderList) {
            var files = fs.readdirSync(folder);
            files.forEach(function(item) {
                var tmpPath = folder + '/' + item,
                    stats = fs.statSync(tmpPath);

                if (stats.isDirectory()) {
                    walk(tmpPath, fileList, folderList);
                    folderList.push(path.resolve(tmpPath));
                } else {
                    fileList.push(path.resolve(tmpPath));
                }
            });
        };

    walk(folder, fileList, folderList);

    return {
        files: fileList,
        folders: folderList
    };
}

function createFolder(folder, callback) {
    var originDir = folder;
    try {
        if (fs.existsSync(folder)) return;

        let list = [folder];
        folder = path.dirname(folder);
        while (!fs.existsSync(folder)) { //检查父目录是否存在
            list.push(folder);
            folder = path.dirname(folder);
        }

        while (list.length > 0) {
            fs.mkdirSync(list.pop());
        }

        if (callback) callback();
    } catch (e) {
        console.log(e);
    }
}

function copyFile(src, dst) {
    fs.readFile(src, (err, data) => {
        if (err) {
            return;
        }

        fs.writeFile(dst, data);
    });
}

/**
 * 修正路劲
 */
function correctPath(filePath) {
    filePath += '';
    // windows平台支持\和/，POSIX上是/
    return filePath.replace(/\\/g, '/');
}
/**
 * 移除空格
 */
function trim(text) {
    return text.trim();
}

module.exports = {
    formatKey,
    decodeKey,
    deepMerge,
    loadJsonSync,
    loadFile,
    loadJson,
    loadExcel,
    scanFolder,
    createFolder,
    copyFile,
    writeTextFile,
    writeExcel,
    correctPath,
    writeJson,
    mergeObject,
    getDirname,
    trim,
    log
};