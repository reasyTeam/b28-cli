# 翻译工具，Excel/Json 处理工具

**该工具同时包含以下几个功能：**

- [提取代码中的中英文词条](#词条提取)
- [通过 Excel 将代码中的词条替换成目标语言的词条](#翻译文件)
- [检查代码中词条翻译替换的正确性](#翻译检查)
- [将 Excel 文件转成 JSON 文件](#Excel转JSON数组或者对象)
- [将 JSON 文件转成 Excel 文件](#JSON转EXCEL文件)
- [深度合并 JSON 文件](#合并JSON文件)
- [原厂代码添加翻译函数](#原厂代码添加翻译函数)
- [提取全部词条](#提取全部词条)
- [语言包检查](#语言包检查)
- [文件转码](#文件转码)

## 安装

```
npm install b28-cli -g
```

### 指令

```
# 运行工具
cd xxx
b28-cli

# 初始化配置文件b28.config.js
b28-cli init

# 查看版本号
b28-cli -v

# 查看帮助
b28-cli -h
```

## 文件词条提取说明

### JS 提取替换方法：

通过[`babylon`](https://www.npmjs.com/package/babylon)将`js`代码转成`AST`(抽象语法树)，通过遍历`AST`得到需要提取的内容，并对`AST`进行修改，最后通过[`babel-generator`](https://www.npmjs.com/package/babel-generator)将`AST`转成代码文件输出。
一开始选择[`Esprima`](https://www.npmjs.com/package/esprima)进行代码转`AST`，但[`Esprima`](https://www.npmjs.com/package/esprima)对注释的处理有点问题，通过[`Escodegen`](https://www.npmjs.com/package/escodegen)将`AST`转代码时，注释丢失或者位置不对，没找到解决方案，故换成[`babylon`](https://www.npmjs.com/package/babylon).

### HTML 提取替换方法：

通过[`jsdom`](jsdom)将`html`代码转成`DOM`树，然后对`DOM`进行遍历。

### Vue 文件提取替换方法：

将`template`和`script`模块分开进行处理。`script`代码还是按照 JS 的逻辑进行处理。`template`的解析处理参考`vue`的`compiler`模块进行解析。首先遍历 html 节点提取翻译相关的属性和文本信息，包括词条的`start`和`end`位置索引，然后解析提取的信息，提取需要翻译的词条，同时将翻译后的词条对原`template`进行原地替换，最后输出替换后的 vue 文件。

**对于含有翻译函数`_()`的表达式会直接提取，不包含翻译函数的表达式只有包含中文的情况下才会进行提取和翻译替换。纯英文词条默认不提取，以为无法区分是表达式还是词条。**

默认的处理如下：

- 对于指令只对`v-bind`的指令做处理，其它指令不会涉及多语言相关内容。如果指令中包含`_('')`翻译函数，则只处理翻译函数内的词条，其它内容不做处理。如果不包含翻译函数，且含有中文，则进行提取和替换
- 对于非`v-bind`属性`title`、`alt`、`placeholder`如果内容是中文，则会进行提取，翻译的时候会将该内容替换为对应`v-bind`格式
- 对于文本内容会将`{{}}`模板语法内的表达式提取为参数，然后将整个词条重新组装为`{{_('xxxx %s xxx', [ars])}}`格式，并且将原文本进行替换

示例如下：

```vue
<template>
  <div>
    <div title="我是标题">{{ "这是测试1" + test }}</div>
    <div :title="anna">{{ _("这是测试2") + check }}</div>
    <div :key="_('我也是标题')">我就是一段纯文本而已！</div>
    <v-pop :option="dialog" v-model="dialog.show"
      >这是内容：{{ coneten + mess }}</v-pop
    >
  </div>
</template>
```

进行工具翻译替换后：

```vue
<template>
  <div>
    <div :title="_('this is title')">
      {{ _("this is test one %s", [test]) }}
    </div>
    <div :title="anna">{{ _("this is test two") + check }}</div>
    <div :key="_('This is title too')">
      {{ _("Just a pure text message.") }}
    </div>
    <v-pop :option="dialog" v-model="dialog.show">{{
      _("this is content: %s%s", [content, mess])
    }}</v-pop>
  </div>
</template>
```

![处理结果](./img/vue.jpg)

## 使用方式

1. 通过[WinForm](B28.exe)界面程序直接操作（只支持 windows 环境）

   ![b28](https://raw.githubusercontent.com/moshang-xc/b28-cli/master/img/b28.jpg?1)

2) 通过[b28.config.js](#b28.config.js)进行配置，在目标路径下面添加`b28.config.js`配置文件，见[参数配置说明](#配置参数说明)
   > 如果有读取到配置参数，则直接按配置参数运行工具。若读取的配置错误则会通过下面的使用方式重新输入配置项修正数据。
   > 直接通过命令行交互的形式,如下图

```
    # 切换到目标路径
    cd xxx

    # 运行指令
    b28-cli
```

![交互](https://raw.githubusercontent.com/moshang-xc/b28-cli/master/img/cmd.jpg?1)

参数配置见见[参数配置说明](#配置参数说明)

## 配置参数说明

示例`b28.config.js`

```js
// 翻译文件配置
module.exports = {
  commandType: 1,
  /**
   * 待翻译文件根目录
   */
  baseTranslatePath: "./test/TestFile/test/allTest",
  /**
   * 翻译后文件输出根目录
   */
  baseTransOutPath: "./test/TestFile/output/allTest",
  /**
   * 语言包文件地址
   */
  languagePath: "./test/TestFile/testData/allTest/translate.xlsx",
  /**
   * 宏文件地址
   */
  hongPath: "./test/TestFile/config/index.js",
  /**
   * key对应列
   */
  keyName: "EN",
  /**
   * value对应列
   */
  valueName: "CN",
  /**
   * Excel对应的sheet名称
   */
  sheetName: ""
};
```

### 公共参数

`commandType`: 操作类型，枚举值

- 0: 提取词条
- 1: 翻译文件
- 2: 翻译检查
- 3: Excel 转 JSON
- 4: JSON 转 Excel
- 5: JSON 合并
- 6: 原厂代码添加翻译函数
- 7: 提取全部词条
- 8: 语言包检查
- 9: 文件转码

> 下面的所有地址参数既可以是绝对路径也可以是相对路径。相对路径为当前执行命令地址的相对路径。
> 所有输出的目录可以为当前还不存在的文件夹，但其最初始目录必须存在

### 词条提取

提取`html`和`JS`中所有的文本词条，以供其它地方使用或替换。

| 属性         | 值类型  | 默认值         | 说明                      |
| ------------ | ------- | -------------- | ------------------------- |
| onlyZH       | Boolean | false          | 只提取中文词条            |
| baseReadPath | String  | `必填`         | 待提取文件根目录          |
| baseOutPath  | String  | `baseReadPath` | 提取的 Excel 文件输出目录 |
| hongPath     | String  | 空             | 功能宏文件地址            |

> `baseReadPath`: 既可以是文件夹也可以是具体的文件
> `baseOutPath`: 当`baseReadPath`为具体的文件时，该默认值为文件所在的文件夹地址

### 翻译文件

对代码文件进行翻译，对应需要翻译的文件，进行翻译输出，不需要翻译的文件进行拷贝输出，替换代码中所有需要替换的词条。当提供的语言包为`Excel`时，会同时生成对应的语言 JSON 文件，已保证翻译后的文件与语言文件是能够一一对应的。

| 属性              | 值类型 | 默认值              | 说明                             |
| ----------------- | ------ | ------------------- | -------------------------------- |
| baseTranslatePath | String | `必填`              | 待翻译文件根目录                 |
| baseTransOutPath  | String | `baseTranslatePath` | 翻译后文件输出根目录             |
| languagePath      | String | `必填`              | 语言包文件地址,`JSON`或`Excel`   |
| hongPath          | String | 空                  | 功能宏文件地址                   |
| sheetName         | String | 第一个 Sheet        | Excel 中对应的 Sheet 名称        |
| keyName           | String | EN                  | Excel 中需要替换到代码中的列值   |
| valueName         | String | CN                  | Excel 中对应现有代码中的字段值列 |

> `languagePath`: 值为 Excel 时才需要提供字段`sheetName`、`keyName`、`valueName`
>
> 将 Excel 中的第一行作为标题行，`keyName`和`valueName`对应标题行每列的值

### 翻译检查

检查当前的代码中是否有漏翻译的对象，与现有的语言包匹配，找出漏掉或错改的词条。

| 属性          | 值类型 | 默认值          | 说明                 |
| ------------- | ------ | --------------- | -------------------- |
| baseCheckPath | String | `必填`          | 待检查文件根目录     |
| langJsonPath  | String | `必填`          | 语言包 json 文件地址 |
| hongPath      | String | 空              | 功能宏文件地址       |
| logPath       | String | `baseCheckPath` | 检查信息输出路径     |

> `langJsonPath`: 为保证检查结果的准确性，必须为`JSON`文件

### Excel 转 JSON 数组或者对象

将 Excel 转成 JSON 文件，并返回对应的对象。提供一列数据，转成对应的数组，提供多列，则分别与 key 列形成多个对象，输出到制定 JSON 文件.

| 属性        | 值类型 | 默认值       | 说明                                       |
| ----------- | ------ | ------------ | ------------------------------------------ |
| excelPath   | String | `必填`       | Excel 文件地址                             |
| keyName     | String | EN           | 作为对象 key 值的列                        |
| valueName   | String | 空           | 作为对象 value 值的列,多个列用英文逗号隔开 |
| sheetName   | String | 第一个 Sheet | Excel 中对应的 sheet 名称                  |
| outJsonPath | String | `excelPath`  | 输出 json 文件地址                         |

### JSON 转 EXCEL 文件

将数值或者对象，转成一列或者两列的 Excel 文件

| 属性         | 值类型 | 默认值   | 说明                                             |
| ------------ | ------ | -------- | ------------------------------------------------ |
| jsonPath     | String | `必填`   | json 文件地址,多个 json 文件合并时输入文件夹地址 |
| outExcelPath | String | jsonPath | 输出 Excel 文件地址                              |

> `outExcelPath`: 可以是具体的文件名，也可以是输出文件所在的目录。为具体文件，则按给定的名称输出到给定的位置。给定的为目录，则在该目录下输出`json2Excel.xlsx`文件。

### 合并 JSON 文件

深度合并两个或多个 JSON 文件，可以是数组也可以是对象，但所有待合并的文件必须同为数组或者同为对象。

| 属性             | 值类型 | 默认值                   | 说明                                     |
| ---------------- | ------ | ------------------------ | ---------------------------------------- |
| mainJsonPath     | String | `必填`                   | 主 json 文件地址                         |
| mergeJsonPath    | String | `必填`                   | 次 json 文件地址，多个文件用英文逗号隔开 |
| outMergeJsonPath | String | `mainJsonPath`所在文件夹 | 合并后输出的地址                         |

> 主 json 文件地址文件的优先级最高，如果存在值相同的，保留主 json 文件的内容，多个次 JSON 文件时，排在后面的文件优先级高于前面的文件。

### 原厂代码添加翻译函数

在原厂代码中添加翻译函数`_()`，实现多语言产品需求

| 属性           | 值类型                      | 默认值               | 说明                                                |
| -------------- | --------------------------- | -------------------- | --------------------------------------------------- |
| baseProPath    | String                      | `必填`               | 原厂代码地址                                        |
| baseProOutPath | String                      | `baseProPath`        | 添加翻译函数后文件输出地址                          |
| ignoreCode     | `String`/`Regexp`           | `/<!--\s*hide|-->/g` | 需要注释的代码正则                                  |
| templateExp    | `String`/`Regexp`           | `/<%([^\n]*?)%>/g`   | JS 文件中后台用于插入替换的模板表达式对应的正则     |
| customRules    | `Array`/`Function`/`Regexp` | `[]`                 | 自定义不提词条规则列表，可以是正则也可以是 function |

> `ignoreCode`: 原厂代码中需要注释的代码对应的`正则`，不注释对应的 js 代码会有语法错误，例如部分原厂代码中在代码开头会包含`<!--\s*hide`代码段等
>
> `templateExp`: 原厂中没有实现前后端分离，通过特定的模板语法注入参数的代码段对应的`正则`，如`<%ejGetOther(sessionKey)%>`
>
> `customRules`: 用于设置默认规则外，不进行提取的词条

**预设不进行翻译配置如下**

- 全数字
- 单个字母
- <% xxxx %>格式的字符串
- ([xxx])格式
- html 标签
- 全大写字母
- url
- 数字，字母，特殊符号(不包含空格)组成的字符串，必须包含[数字,=,?]中的一个

### 提取全部词条及其对应全部翻译

通过[词条提取][#词条提取]获取代码中全部词条，以提取到的词条为 key 值，导入多国语言翻译，生成完整的多国语言 excel，类似于最终的语言包。

- 避免出现新功能开发&新增语种时漏提取词条
- 减少整理语言包、导入语言包时间

| 属性         | 值类型 | 默认值 | 说明                                              |
| ------------ | ------ | ------ | ------------------------------------------------- |
| baseReadPath | String | `必填` | 待提取文件根目录                                  |
| languagePath | String | `必填` | 语言包文件夹地址，默认语言包名称为 translate.json |
| baseOutPath  | String | `必填` | Excel 文件输出目录                                |
| hongPath     | String | 空     | 功能宏文件地址                                    |

### 语言包检查

检查需要翻译的词条是否进行了修改/优化。

| 属性       | 值类型 | 默认值 | 说明                                                      |
| ---------- | ------ | ------ | --------------------------------------------------------- |
| outExcel   | String | `必填` | 包含所有需要翻译词条的 excel 文件地址（提供给资料的文件） |
| sheetName1 | String | 空     | outExcel 的 sheetName                                     |
| keyName1   | String | `EN`   | outExcel 需要对比的列                                     |
| inExcel    | String | `必填` | 翻译后的 excel 文件地址（资料返回的文件）                 |
| sheetName2 | String | 空     | inExcel 的 sheetName                                      |
| keyName2   | String | `EN`   | inExcel 需要对比的列                                      |

> 主 json 文件地址文件的优先级最高，如果存在值相同的，保留主 json 文件的内容，多个次 JSON 文件时，排在后面的文件优先级高于前面的文件。

### 文件转码

批量对文件编码格式进行转换，默认转为**UTF-8**。

| 属性          | 值类型 | 默认值  | 说明                             |
| ------------- | ------ | ------- | -------------------------------- |
| transFilePath | String | `必填`  | 待转码文件地址                   |
| transOutPath  | String | 空      | 转码后文件输出地址               |
| transEncode   | String | `UTF-8` | 转码后文件的编码方式(默认 UTF-8) |

## 目录结构
```
b28-cli
├── .babelrc
├── .eslintrc.js
├── .gitignore
├── .npmignore
├── B28.exe
├── b28n.js                   ## 浏览器中使用的翻译文件
├── index.js                  ## 入口文件
├── package-lock.json
├── package.json
├── README.MD
├── test                        ## 单元测试
├── src
|   ├── checkLangExcel.js       ## excel翻译检查
|   ├── cmd.js                  ## 命令行交互指令处理
|   ├── encode.js               ## 文件转码
|   ├── excel2json.js           ## excel转接送
|   ├── ExtractFile.js          ## 提取、翻译词条入口文件
|   ├── ExtractFileOrigin.js    ## 原厂代码提取、翻译词条入口文件
|   ├── ExtractLangExcel.js     ## 语言包excel解析处理
|   ├── handle.js               ## 各功能输入参数处理
|   ├── index.js                ## 工具入口文件
|   ├── json2excel.js           ## json转excel
|   ├── mergeJson.js            ## json合并
|   ├── util                    ## 工具类函数
|   |   ├── config.js         
|   |   ├── getOption.js
|   |   └── index.js
|   ├── extractOrigin           ## 原厂代码处理   
|   |   ├── extract.js
|   |   ├── extract_html_ori.js 
|   |   └── extract_js_ori.js
|   ├── extract                 ## 提取、翻译核心代码
|   |   ├── extract-html.js     ## html文件处理
|   |   ├── extract-js.js       ## js文件处理
|   |   ├── extract-regexp.js   ## 其它类型文件处理
|   |   ├── extract-vue.js      ## vue文件处理
|   |   ├── extract.js          ## 文件处理基类
|   |   ├── vue         
|   |   |   ├── html-parser.js  ## vue template解析
|   |   |   ├── util.js         ## 工具函数
|   |   |   └── vue-compiler.js ## Vue SPC解析
|   |   ├── extractRegexp       ## 通过正则进行文件解析核心代码
|   |   |   ├── index.js        
|   |   |   └── lib.js           
|   ├── debug                   ## 开发调试配置
|   |   ├── index.js            ## 调试入口
|   |   └── test.js             ## 调试用例
├── .vscode
|   └── launch.json             ## vscode 调试配置文件
├── img
└── dist
```

## 更新日志

#### 【2020.11.19】

- 添加`ts`语法支持
- 添加提取语法不支持或报错后，自动采用通用正则方式重新提取

#### 【2020.07.14】

- 添加`ES6`模板语法词条提取，合并，翻译替换支持
- 添加`v-html`指令词条提取支持
- 修复使用翻译函数时，翻译函数参数也有翻译函数，词条不提取问题，例如：`:title="_('xxxx %s', _('xxxxx'))"`
- 修复 Vue 文件格式化添加空格后翻译替换错位问题

#### 【2020.07.08】

- 修复 excel2json，多个 sheet 存在时，数据转换出错问题

#### 【2020.04.03】

- 添加翻译检查，输出 json 中有但是代码中不包含的词条
- 修改词条过滤规则，去除全字母和符号被过滤的规则

#### 【2020.01.16】

- 添加文件转码功能

#### 【2020.01.14】

- 解决部分词条无法提取 bug

#### 【2019.09.25】

- 新增提取全部词条和检查语言包功能
- 更新 b28.exe

#### 【2019.08.12】

- 添加`.Vue`文件词条的提取和翻译替换，同时对`template`需要添加翻译函数的地方会自动的添加翻译函数
- 添加`JS`文件中包含的中文词条提取和翻译替换，没有添加翻译函数的词条自动添加翻译函数

#### 【2019.06.10】

- 修改参数配置错误信息，提供具体的参数错误说明
- 添加 JSON 部分合并功能，满足删除多余词条的业务场景

#### 【2019.06.04】

- 添加原厂代码添加翻译函数功能，支撑原厂代码多国语言的快速开发
- 添加提取全部词条和语言包整合，输出完整的 excel 文件，并对未翻译词条进行标注
- 添加语言包检查，检查资料返回的语言包与需要翻译词条是否一致

#### 【2019.02.25】

- 添加 Mac os 支持
- 添加主入口测试用例
- 添加控制台交互
- 添加 winform 交互
- 添加命令行交互

#### 【2019.02.20】

- 添加 excel 同时转多列数据
- 添加自动化测试用例

## 备注：

![流程图](https://raw.githubusercontent.com/moshang-xc/b28-cli/master/img/flow.png?1)

>
