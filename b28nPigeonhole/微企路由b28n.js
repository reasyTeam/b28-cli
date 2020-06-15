(function(window, document) {
    Array.prototype.indexOf = Array.prototype.indexOf || function(item) {
        for (let i = 0, l = this.length; i < l; i++) {
            if (this[i] === item) {
                return i;
            }
        }
        return -1;
    };

    Array.prototype.filter = Array.prototype.filter || function(cb) {
        let arr = [];
        if (cb && typeof cb === 'function') {
            for (let i = 0, l = this.length; i < l; i++) {
                cb(this[i]) && arr.push(this[i]);
            }
        }
        return arr;
    };

    //翻译配置项
    let b28Cfg = {
        /**
         * 支持的语言项，若设置的语言不在配置项中，则显示默认语言
         */
        supportLang: ['en', 'cn'],
        /**
         * 默认语言，若supportLang中没有设置的默认语言，则自动添加到supportLang中去
         */
        defaultLang: 'en',
        /**
         * 配置语言包文件类型 within ["xml", "json"]
         */
        fileType: 'json',
        /**
         * 用默认语言做id
         */
        idDefaultLang: true,
        /**
         * 是否对要翻译文字进行trim
         */
        trimText: true,
        /**
         * 默认替换节点中的文字，将其设为true可插入html
         */
        insertHTML: true,
        /**
         * 是否初始化下拉框
         */
        initSelect: true,
        /**
         * 时间戳
         */
        dateStr: new Date().getTime(),

        langArr: {
            "cn": "简体中文",
            "zh": "繁體中文",
            "de": "Deutsch", //德语
            "en": "English", //英语
            "es": "Español", //西班牙
            "fr": "Français", //法国
            "hu": "Magyar", //匈牙利
            "it": "Italiano", //意大利
            "pl": "Polski", //波兰
            "ro": "Română", //罗马尼亚
            "ar": "العربية", //阿拉伯
            "tr": "Türkçe", //土耳其
            "ru": "Русский", //Russian  俄语
            "pt": "Português" //Portugal 葡萄牙语
        }
    };


    //对象浅拷贝
    function extend(oldObj, newObj) {
        if (typeof newObj !== 'object') {
            return;
        }

        for (let key in newObj) {
            if (newObj.hasOwnProperty(key)) {
                oldObj[key] = newObj[key];
            }
        }
    }

    let win = window,
        doc = document,
        core_version = "3.0.0",
        core_trim = core_version.trim,

        //获取语言文件相对路径
        js = document.scripts,
        langJs = js[js.length - 1]['src'],
        langPath = langJs.substring(0, langJs.lastIndexOf("/") + 1),

        // JSON RegExp
        rvalidchars = /^[\],:{}\s]*$/,
        rvalidbraces = /(?:^|:|,)(?:\s*\[)+/g,
        rvalidescape = /\\(?:["\\\/bfnrt]|u[\da-fA-F]{4})/g,
        rvalidtokens = /"[^"\\\r\n]*"|true|false|null|-?(?:\d+\.|)\d+(?:[eE][+-]?\d+|)/g;

    /**
     * 去除字符串首尾空格全兼容
     */
    function trim(text) {
        if (text == null) {
            return "";
        }
        if (core_trim && !core_trim.call("\uFEFF\xA0")) {
            return core_trim.call(text);
        } else {
            text += "";
            return text.replace(/(^\s*)|(\s*$)/g, "");
        }
    }

    /**
     * 根据配置参数决定是否去除空格
     */
    function _trim(str) {
        if (b28Cfg.trimText) {
            return trim(str);
        } else {
            return str;
        }
    }

    /**
     * json转Object
     */
    function parseJSON(data) {
        if (window.JSON && window.JSON.parse) {
            return window.JSON.parse(data);
        }

        if (data === null) {
            return data;
        }

        if (typeof data === "string") {
            // Make sure leading/trailing whitespace is removed (IE can't handle it)
            data = trim(data);

            if (data) {
                // Make sure the incoming data is actual JSON
                // Logic borrowed from http://json.org/json2.js
                if (rvalidchars.test(data.replace(rvalidescape, "@")
                        .replace(rvalidtokens, "]")
                        .replace(rvalidbraces, ""))) {

                    return (new Function("return " + data))();
                }
            }
        }
    }

    /**
     * 创建ajax
     */
    function createXHR() {
        try {
            return new XMLHttpRequest();
        } catch (e) {
            try {
                return new window.ActiveXObject("Msxml2.XMLHTTP");
            } catch (e) {
                try {
                    return new window.ActiveXObject("Microsoft.XMLHTTP");
                } catch (e) {
                    return;
                }
            }
        }
    }

    /**
     * 获取元素的文本内容
     */
    let innerText = (function() {
        if (b28Cfg.insertHTML) {
            return function(elem, str) {
                // if (str) {
                elem.innerHTML = str;
                return elem;
                // }
            };
        }

        let element = doc.createElement('p');
        element.innerHTML = core_version;
        return element.textContent ? function(elem, str) {
            if (str) {
                elem.textContent = str;
                return elem;
            }
            return elem.textContent;

        } : function(elem, str) {
            if (str) {
                elem.innerText = str;
                return elem;
            }
            return elem.innerText;
        };
    }());

    /**
     * 是否是html元素
     */
    function assertElement(elem) {
        //支持HTMLElement
        if (typeof HTMLElement === 'object' && elem instanceof HTMLElement) {
            return true;
        }
        //ie等
        if (typeof elem === 'object' && (elem.nodeType === 1 || elem.nodeType === 9) &&
            typeof elem.nodeName === 'string') {
            return true;
        }
        return false;
    }

    /**
     * 添加文档加载完成后的事件委托
     */
    let domReady = (function() {
        let funcs = [],
            already = false,
            len,
            i;

        function handler(e) {
            e = e || win.event;
            if (already) {
                return;
            }

            if (e.type === 'readystatechange' && doc.readyState !== 'complete') {
                return;
            }

            for (i = 0, len = funcs.length; i < len; i++) {
                funcs[i].call(doc);
            }

            already = true;
            funcs = null;
        }

        if (doc.addEventListener) {
            doc.addEventListener("DOMContentLoaded", handler, false);
            doc.addEventListener("onreadystatechange", handler, false);
            win.addEventListener("load", handler, false);
        } else if (doc.attachEvent) {
            doc.attachEvent('onreadystatechange', handler);
            win.attachEvent('onload', handler);
        }

        return function ready(f) {
            if (already) {
                f.call(doc);
            } else {
                funcs.push(f);
            }
        };
    }());

    /**
     * 加载script
     */
    let loadScript = (function() {
        let scripts = doc.createElement("script"),
            hasReadyState = scripts.readyState;

        return hasReadyState ? function(url, callBack) {
            let scripts = doc.createElement("script");

            scripts.onreadystatechange = function() {
                if (scripts.readyState === 'loaded' ||
                    scripts.readyState === 'complete') {
                    scripts.onreadystatechange = null;

                    if (typeof callBack === "function") {
                        callBack();
                        callBack = null;
                    }
                }
            };
            scripts.src = url;
            doc.getElementsByTagName("head")[0].appendChild(scripts);

        } : function(url, callBack) {
            let scripts = doc.createElement("script");

            scripts.onload = function() {
                if (typeof callBack === "function") {
                    callBack();
                    callBack = null;
                }
            };
            scripts.src = url;
            doc.getElementsByTagName("head")[0].appendChild(scripts);
        };
    })();

    /** 
     * 加载JSON翻译文件，并注入到MSG对象中
     * @param {string} url 
     * @param {function} callBack 
     */
    function loadJSON(url, callBack) {
        var request = createXHR();

        request.open("GET", url + "?" + Math.random(), false);
        //request.setRequestHeader("If-Modified-Since", "1");
        //request.setRequestHeader("Accept", "application/json, text/javascript, */*; q=0.01");
        request.send(null);

        if (request.status >= 200 && request.status < 300 || request.status === 304) {
            let langData = parseJSON(request.responseText);
            // MSG.extend();
            if (typeof callBack === "function") {
                callBack(langData);
                callBack = null;
            }
        }
    }

    /**
     * 加载XML翻译文件，并注入到MSG对象中
     * @param {string} url 
     * @param {function} callBack 
     */
    function loadXML(url, callBack) {
        var request,
            i,
            pos,
            posLen;

        request = createXHR();
        request.open("GET", url + "?" + Math.random(), false);
        //request.setRequestHeader("If-Modified-Since", "1");
        request.send(null);

        if (request.status >= 200 && request.status < 300 || request.status === 304) {
            pos = request.responseXML.documentElement.getElementsByTagName("message");
            posLen = pos.length;
            let langData = {};
            for (i = 0; i < posLen; i++) {
                // MSG[pos[i].getAttribute("msgid")] = pos[i].getAttribute("msgstr");
                langData[pos[i].getAttribute("msgid")] = pos[i].getAttribute("msgstr");
            }

            if (typeof callBack === "function") {
                callBack(langData);
                langData = null;
                callBack = null;
            }
        }
    }

    /**
     * 去除lang-xx类名，并添加新的类名
     */
    function handleClass(classname) {
        let name = document.documentElement.className;
        if (name) {
            name = name.split(' ').filter((item) => {
                return !/^lang-/.test(item);
            });
            name.push(classname);

            document.documentElement.className = name.join(' ');
        } else {
            document.documentElement.className = classname;
        }
    }

    function notNull(val) {
        return val && /\S/.test(val);
    }

    function getTextChild(elem) {
        if (elem) {
            let first = elem.firstChild;
            if (first) {
                if (first.nodeType === 3) {
                    return first.nodeValue;
                }
                return getTextChild(first.nextSibling);
            }
        }
    }

    function htmlEncode(str) {
        var encodeObj = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '\'': '&#39;',
            '"': '&quot;',
            ' ': '&nbsp;'
        };
        if (str.length == 0) {
            return '';
        }
        return str.replace(/(&|\s| |<|>|\'|\")/g, function(a) {
            return encodeObj[a];
        });
    }

    function htmlDecode(str) {
        var decodeObj = {
            '&amp;': '&',
            '&lt;': '<',
            '&gt;': '>',
            '&#39;': '\'',
            '&quot;': '"',
            '&nbsp;': ' '
        };
        if (str.length == 0) {
            return '';
        }
        return str.replace(/(&amp;|&lt;|&gt;|&#39;|&quot;|&nbsp;)/g, function(a) {
            return decodeObj[a];
        });
    }

    //翻译对象
    function Butterlation(cfg) {
        extend(b28Cfg, cfg);

        //若所支持的语言中没有默认语言，则将默认语言添加到支持语言数组中
        if (b28Cfg.idDefaultLang && b28Cfg.supportLang.indexOf(b28Cfg.defaultLang) === -1) {
            b28Cfg.supportLang.push(b28Cfg.defaultLang);
        }
        this.curDomain = 0;
        this.domainArr = [];
        this.options = {
            defaultLang: b28Cfg.defaultLang,
            support: b28Cfg.supportLang,
            fileType: b28Cfg.fileType
        };
        this.langArr = b28Cfg.langArr;
        /**语言包文件是否加载完成标志 */
        this.b28Loaded = false;
        /**当前语言 */
        this.lang = '';
        /**是否记录当前语言用于无刷新翻译页面 */
        this.saveLang = false;
        /**当前语言包信息 */
        this.langData = {};
        /**记录翻译页面前的数据 */
        this.original = {
            title: doc.title
        };

    }

    Butterlation.prototype = {
        /**
         * 翻译title
         */
        transTitle: function(title) {
            doc.title = this.gettext(_trim(title));
        },
        /**
         * 翻译html元素节点
         * @param {object} element 
         */
        replaceTextNodeValue: function(element) {
            if (!element) {
                return;
            }
            if (/^SCRIPT$/i.test(element.tagName)) {
                if (element.nextSibling) {
                    this.replaceTextNodeValue(element.nextSibling);
                }
                return;
            }

            let firstChild = element.firstChild,
                nextSibling = element.nextSibling,
                nodeType = element.nodeType,
                btnStr = "submit,reset,button",
                curValue, isInputButton, oldValue;

            //handle element node
            if (nodeType === 1) {
                //alt属性
                curValue = element.getAttribute('alt');
                if (this.saveLang) {
                    oldValue = element.getAttribute('data-o-alt');
                    if (oldValue) {
                        curValue = oldValue;
                    } else {
                        notNull(curValue) && element.setAttribute("data-o-alt", curValue);
                    }
                }
                if (notNull(curValue)) {
                    curValue = _trim(curValue);
                    element.setAttribute("alt", this.gettext(curValue));
                }

                //placeholder属性
                curValue = element.getAttribute("placeholder");
                if (this.saveLang) {
                    oldValue = element.getAttribute('data-o-holder');
                    if (oldValue) {
                        curValue = oldValue;
                    } else {
                        notNull(curValue) && element.setAttribute("data-o-holder", curValue);
                    }
                }
                if (notNull(curValue)) {
                    curValue = _trim(curValue);
                    element.setAttribute("placeholder", this.gettext(curValue));
                }

                //title属性
                curValue = element.getAttribute("title");
                if (this.saveLang) {
                    oldValue = element.getAttribute('data-o-title');
                    if (oldValue) {
                        curValue = oldValue;
                    } else {
                        notNull(curValue) && element.setAttribute("data-o-title", curValue);
                    }
                }
                if (notNull(curValue)) {
                    curValue = _trim(curValue);
                    element.setAttribute("title", this.gettext(curValue));
                }

                isInputButton = element.nodeName.toLowerCase() == "input" &&
                    (btnStr.indexOf(element.getAttribute("type")) !== -1);

                if (isInputButton) {
                    //data-lang属性具有较高优先级
                    curValue = element.getAttribute("data-lang") || element.value;
                } else {
                    if (element.getAttribute("data-nowrap") === '1') {
                        curValue = element.innerHTML;
                    } else {
                        curValue = element.getAttribute("data-lang");
                    }
                }

                if (curValue && /\S/.test(curValue)) {
                    curValue = htmlEncode(curValue);
                    if (this.saveLang) {
                        let oldText = element.getAttribute('data-o-text');
                        if (oldText === undefined || oldText === null) {
                            if (element.getAttribute("data-nowrap") === '1') {
                                oldText = curValue;
                            } else {
                                oldText = getTextChild(element);
                                notNull(oldText) && (oldText = htmlEncode(oldText));
                            }
                            oldText = oldText || ' ';
                            element.setAttribute('data-o-text', oldText);
                        }

                        if (this.options.defaultLang === this.lang) {
                            curValue = oldText;
                        }
                    }

                    curValue = htmlDecode(curValue);
                    if (curValue) {
                        curValue = _trim(curValue);
                        if (isInputButton) {
                            element.setAttribute("value", this.gettext(curValue));
                        } else {
                            innerText(element, this.gettext(curValue));
                        }
                    }
                }
                //handle textNode
            } else if (nodeType === 3 && notNull(element.nodeValue)) {
                curValue = _trim(element.nodeValue);
                if (this.saveLang) {
                    let parNode = element.parentNode;
                    oldValue = parNode.getAttribute('data-o-text');
                    if (oldValue) {
                        curValue = htmlDecode(oldValue);
                    } else {
                        parNode.setAttribute('data-o-text', htmlEncode(curValue));
                    }
                }
                element.nodeValue = this.gettext(curValue);
            }
            //translate siblings
            if (nextSibling) {
                this.replaceTextNodeValue(nextSibling);
            }

            //translate firstChild
            //stop handle elem.child if elem has attr data-lang
            if (firstChild && !element.getAttribute("data-lang")) {
                this.replaceTextNodeValue(firstChild);
            }
        },
        /**
         * 获取语言包信息
         */
        getMsg: function() {
            return this.langData;
        },
        /**
         * 是否支持该语言
         * @param {string} lang 
         */
        isSupport: function(lang) {
            let support = this.options.support;

            if (support.indexOf(lang) === -1) {
                return false;
            }
            return lang;
        },

        /**
         * 设置语言
         * @param {string} lang 
         */
        setLang: function(lang) {
            if (lang !== undefined) {
                if (!this.isSupport(lang)) {
                    lang = this.options.defaultLang;
                }
                doc.cookie = "bLanguage=" + lang + ";";
            }
            return lang;
        },

        /**
         * 获取当前设置的语言
         */
        getLang: function() {
            let special = {
                    "zh": "cn",
                    "zh-chs": "cn",
                    "zh-cn": "cn",
                    "zh-cht": "cn",
                    "zh-hk": "zh",
                    "zh-mo": "zh",
                    "zh-tw": "zh",
                    "zh-sg": "zh"
                },
                defLang = this.options.defaultLang,
                local, ret, start, end;

            if ((doc.cookie.indexOf("bLanguage=")) === -1) {
                local = (win.navigator.language || win.navigator.userLanguage ||
                    win.navigator.browserLanguage || win.navigator.systemLanguage || defLang).toLowerCase();

                ret = special[local] || special[local.split("-")[0].toString()];
            } else {
                if (doc.cookie.indexOf("bLanguage=") === 0) {
                    start = 10;
                } else if (doc.cookie.indexOf("; bLanguage=") !== -1) {
                    start = doc.cookie.indexOf("; bLanguage=") + 12;
                }

                if (start !== undefined) {
                    end = (doc.cookie.indexOf(';', start) !== -1) ?
                        doc.cookie.indexOf(';', start) : doc.cookie.length;
                    ret = doc.cookie.substring(start, end);
                }
            }

            return this.isSupport(ret) || defLang;
        },

        /**
         * 拼接语言文件的url
         * @param {string} domain 语言文件名称不包含扩展名(如:lang.json -> domain为lang)
         */
        getURL: function(domain) {
            return langPath + this.lang + "/" + domain + "." + this.options.fileType + "?" + b28Cfg.dateStr;
        },

        /**
         * 加载所需要的语言文件，并翻译页面
         * @param {string} domain 翻译文件的名称不包含扩展名(如:lang.json -> domain为lang)
         * @param {lang} lang 当前语言
         * @param {function} callBack 回调
         */
        setTextDomain: function(domain, lang, callBack) {
            let i,
                domainLen,
                htmlElem = doc.documentElement;

            this.domainArr = [];
            this.lang = lang || this.getLang();
            this.setLang(lang);
            this.curDomain = 0;
            if (typeof callBack === "function") {
                this.success = callBack;
            }

            htmlElem.style.visibility = "hidden";

            handleClass('lang-' + this.lang);

            if (Object.prototype.toString.call(domain) === "[object Array]") {
                domainLen = domain.length;
                this.domainArr = domain;

                for (i = 0; i < domainLen; i = i + 1) {
                    this.loadDomain(this.getURL(domain[i]), i);
                }
            } else if (typeof domain === "string") {
                this.domainArr.push(domain);
                this.loadDomain(this.getURL(domain), 0);
            }
        },

        /**
         * 加载语言文件
         * @param {string} url 语言包文件地址
         */
        loadDomain: function(url) {
            //若当前设定语言与默认语言一样，则不加载语言文件
            if (b28Cfg.idDefaultLang && this.lang === b28Cfg.defaultLang) {
                this.b28Loaded = true;
                b28Cfg.initSelect && domReady(() => {
                    this.initSelectElem();
                });
                // doc.documentElement.style.visibility = 'visible';
                // if (typeof this.success === 'function') {
                //     this.success();
                // }
                //重置语言对象
                this.langData = {};
                domReady(() => {
                    this.translatePage();
                });
            } else {
                if (this.options.fileType === 'json') {
                    loadJSON(url, (data) => {
                        this.handLangData(data);
                    });
                } else if (this.options.fileType === 'xml') {
                    loadXML(url, (data) => {
                        this.handLangData(data);
                    });
                }
            }
        },

        /**
         * 处理加载的数据文件
         */
        handLangData: function(data) {
            extend(this.langData, data);
            this.loadedDict();
        },

        /**
         * 语言文件加载完成后的回调,界面加载完成后进入翻译工作
         */
        loadedDict: function() {
            let len = this.domainArr.length;
            if (this.curDomain + 1 === len) {
                this.b28Loaded = true;
                domReady(() => {
                    this.translatePage();
                });
            } else {
                this.curDomain += 1;
            }
        },

        /**
         * 语言包文件是否加载完成
         */
        isLoaded: function() {
            return this.b28Loaded;
        },

        /**
         * 翻译纯文本
         * @param {string} key 需要翻译的字段
         */
        gettext: function(key) {
            if (key === undefined) return;
            if (this.options.defaultLang === this.lang) {
                //处理一对多的翻译时对翻译加上了唯一标识的前缀，故需要把这些前缀去掉
                return key.replace(/^[a-zA-Z]\#[a-zA-Z][a-zA-Z][a-zA-Z]\#/g, "");
            }
            return this.langData[key] !== undefined ? this.langData[key] : key.replace(/^[a-zA-Z]\#[a-zA-Z][a-zA-Z][a-zA-Z]\#/g, "");
        },

        /**
         * 翻译有%s参数的文本
         * @param {string} key 需要翻译的字段
         * @param {Array} replacements 参数
         */
        getFormatText: function(key, replacements) {
            let nkey = this.gettext(key),
                index,
                count = 0;
            if (replacements === '' || replacements === undefined) {
                return nkey;
            }
            if (Object.prototype.toString.call(replacements) !== '[object Array]') {
                replacements = [replacements];
            }

            for (let i = 0, l = replacements.length; i < l; i++) {
                nkey = nkey.replace(/%s/, replacements[i]);
            }

            return nkey;
        },

        /**
         * 初始化语言选择框
         */
        initSelectElem: function() {
            let selectElem = doc.getElementById('select-lang'),
                len = b28Cfg.supportLang.length,
                newOption, lang, i;

            if (selectElem && selectElem.nodeName.toLowerCase() == "select") {
                for (i = 0; i < len; i++) {
                    lang = b28Cfg.supportLang[i];
                    newOption = new Option(this.langArr[lang], lang);
                    selectElem.add(newOption, undefined);
                }
                selectElem.value = this.lang;

                if (doc.addEventListener) {
                    selectElem.addEventListener("change", function() {
                        this.setLang(doc.getElementById('select-lang').value);
                        setTimeout(function() {
                            window.location.reload();
                        }, 24);
                    }, false);

                } else if (doc.attachEvent) {
                    selectElem.attachEvent('onchange', function() {
                        this.setLang(doc.getElementById('select-lang').value);
                        setTimeout(function() {
                            window.location.reload();
                        }, 24);
                    });
                }

            }
        },

        /**
         * 翻译translateTarget及translateTarget里面的内容
         * @param {element} translateTarget 需要翻译的内容的容器
         */
        translate: function(translateTarget) {
            let translateElem;
            //确定html容器元素
            if (assertElement(translateTarget)) {
                translateElem = translateTarget;
            } else if (translateTarget && typeof translateTarget === 'string') {
                translateElem = doc.getElementById(translateTarget);
            }
            translateElem = translateElem || doc.documentElement;
            // 隐藏页面
            doc.documentElement.style.visibility = 'hidden';
            // 逐个翻译元素
            this.replaceTextNodeValue(translateElem);

            this.saveLang = false;
            // 显示页面
            doc.documentElement.style.visibility = 'visible';
            // 执行翻译完成后的回调
            if (typeof this.success === "function") {
                this.success();
            }
        },

        /**
         * 翻译页面
         */
        translatePage: function() {

            let bodyElem = doc.body || doc.documentElement;

            // 翻译HTML页面内容
            this.transTitle(this.original.title);

            // 初始语言选择下拉框
            b28Cfg.initSelect && this.initSelectElem();
            //全局翻译时需要记录所有的信息
            this.saveLang = true;
            this.translate(bodyElem);
        }
    };

    let Butterlate = new Butterlation(),
        defaultLang;

    //将翻译对象挂载到window上面
    win.Butterlate = Butterlate;
    win.B = win.B || win.Butterlate;
    win._ = function(key, replacements) {
        return Butterlate.getFormatText(key, replacements);
    };
    win.Butterlate.loadScript = loadScript;
    if (window.beforeTranslate) {
        defaultLang = window.beforeTranslate();
    }
    window.B.setTextDomain("lang", defaultLang);

}(window, document));