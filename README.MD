# 翻译工具，Excel<->Json处理工具

该工具同时包含以下几个功能：
1. 提取代码中的中英文词条
2. 通过Excel将代码中的词条替换成目标语言的词条
3. 检查代码中词条翻译替换的正确性
4. 将Excel文件转成JSON文件
5. 将JSON文件转成Excel文件
6. 深度合并JSON文件

安装
```
npm install b28-cli -g
```

使用方式：
1. 通过[`WinForm`][]界面程序直接操作（只支持windows环境）
2. 通过[b28.config.js][#b28.config.js]进行配置
3. 直接通过命令行交互的形式,如下图

## 配置参数说明

### 公共参数
`commandType`: 操作类型，枚举值
``` 
0: 提取词条
1: 翻译文件
2: 翻译检查
3: Excel转JSON
4: JSON转Excel
5: JSON合并
```

> 下面的所有地址参数既可以是绝对路径也可以是相对路径。相对路径为当前执行命令地址的相对路径。
> 所有输出的目录可以为当前还不存在的文件夹，但其最初始目录必须存在

### 词条提取
提取`html`和`JS`中所有的文本词条，以供其它地方使用或替换。

| 属性 | 值类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| onlyZH | Boolean | false | 只提取中文词条 |
| baseReadPath | String | `必填` | 待提取文件根目录 |
| baseOutPath | String | `baseReadPath` | 提取的Excel文件输出目录 |
| hongPath | String | 空 | 功能宏文件地址 |

> `baseReadPath`: 既可以是文件夹也可以是具体的文件
> `baseOutPath`: 当`baseReadPath`为具体的文件时，该默认值为文件所在的文件夹地址

### 翻译文件
对代码文件进行翻译，对应需要翻译的文件，进行翻译输出，不需要翻译的文件进行拷贝输出，替换代码中所有需要替换的词条。当提供的语言包为`Excel`时，会同时生成对应的语言JSON文件，已保证翻译后的文件与语言文件是能够一一对应的。

| 属性 | 值类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| baseTranslatePath | String | `必填` | 待翻译文件根目录 |
| baseTransOutPath | String | `baseTranslatePath` | 翻译后文件输出根目录 |
| languagePath | String | `必填` | 语言包文件地址,`JSON`或`Excel` |
| hongPath | String | 空 | 功能宏文件地址 |
| sheetName | String | 第一个Sheet | Excel中对应的Sheet名称 |
| keyName | String | EN | Excel中需要替换到代码中的列值 |
| valueName | String | CN | Excel中对应现有代码中的字段值列 |

> `languagePath`: 值为Excel时才需要提供字段`sheetName`、`keyName`、`valueName`

### 翻译检查
检查当前的代码中是否有漏翻译的对象，与现有的语言包匹配，找出漏掉或错改的词条。

| 属性 | 值类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| baseCheckPath | String | `必填` | 待检查文件根目录 |
| langJsonPath | String | `必填` | 语言包json文件地址 |
| hongPath | String | 空 | 功能宏文件地址 |
| logPath | String | `baseCheckPath` | 检查信息输出路径 |

> `langJsonPath`: 为保证检查结果的准确性，必须为`JSON`文件

### Excel转JSON数组或者对象
将Excel转成JSON文件，并返回对应的对象。提供一列数据，转成对应的数组，提供多列，则分别与key列形成多个对象，输出到制定JSON文件.

| 属性 | 值类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| excelPath | String | `必填` | Excel文件地址 |
| keyName | String | EN | 作为对象key值的列 |
| valueName | String | 空 | 作为对象value值的列,多个列用英文逗号隔开 |
| sheetName | String | 第一个Sheet | Excel中对应的sheet名称 |
| outJsonPath | String | `excelPath` | 输出json文件地址 |


### JSON转EXCEL文件
将数值或者对象，转成一列或者两列的Excel文件

| 属性 | 值类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| jsonPath | String | `必填` | json文件地址 |
| outExcelPath | String | jsonPath | 输出Excel文件地址 |

> `outExcelPath`: 可以是具体的文件名，也可以是输出文件所在的目录。为具体文件，则按给定的名称输出到给定的位置。给定的为目录，则在该目录下输出`json2Excel.xlsx`文件。

### 合并JSON文件
深度合并两个或多个JSON文件，可以是数组也可以是对象，但所有待合并的文件必须同为数组或者同为对象。

| 属性 | 值类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| mainJsonPath | String | `必填` | 主json文件地址 |
| mergeJsonPath | String | `必填` | 次json文件地址，多个文件用英文逗号隔开 |
| outMergeJsonPath | String | `mainJsonPath`所在文件夹 | 合并后输出的地址 |

> 主json文件地址文件的优先级最高，如果存在值相同的，保留主json文件的内容，多个次JSON文件时，排在后面的文件优先级高于前面的文件。
>