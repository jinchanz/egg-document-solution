# egg-yuque-viewer

## 功能特性

只需要简单的配置就能够在 web 站点展示语雀文档

## 配置

| 配置项 	| 类型 	| 示例 	| 说明 |
|---|---	|---	|---	|
|search|String|`/api/v1/search`|search route|
|noHeader|bool|true|隐藏 header|
|onlyDoc|bool|true|只展示文件内容，隐藏侧边栏和header|
|view|String|`'/help.html'`| 文档页面路由 |
|prefix|String|`'/documents'`| 文档接口路由 |
|title|String|北斗-帮助文档| 文档页面 title |
|logo|String|http://img.alicdn.com/tfs/TB1pvJLOVXXXXbAXVXXXXXXXXXX-800-800.png| 文档页面 logo |
|showSearch|String|true| 是否显示搜索框 |
|lazyLoad|bool|false| 文档页面是否懒加载 |
|showEditor|bool|false|是否显示跳转到语雀编辑的 icon |
|token|String|''|语雀 token |
|darkMode|bool|true|header 的 dark/light 模式|
|lightColor|String|'#ffffff00'|header 的 light 模式 的颜色|
|blackColor|String|'black'|header 的 dark 模式 的颜色|

## Examples

### plugin.js

```js
exports.yuqueViewer = {
  enable: true,
  package: '@ablula/egg-yuque-viewer',
};
```

### config.default.js

```js
config.yuqueViewer = {
  npm: '@ablula/document-client@0.1.2',
  namespace: 'ant-design/course',
  search: '/documents/search',
  title: 'Ant Design 实战教程',
  prefix: '/documents',
  onlyDoc: false,
  noHeader: false,
  showSearch: true,
  showEditor: false,
  view: '/documents',
  token: '',
  darkMode: true,
  lightColor: '#ffffff00',
  blackColor: 'black',
  logo: 'https://img.alicdn.com/tfs/TB1xYGCA1H2gK0jSZJnXXaT1FXa-204-240.png',
};
```

### app.yuqueViewer

```js
await app.yuqueViewer.search('let');

// return 
{
    data: [
        {
            category: "站点文档",
            content: "<p>asdf</p>",
            locator: "/design/doc/7",
            siteId: 1,
            title: "写一个文档"
        },
        {
            category: "站点文档",
            content: "<pre><code>let a=b;</code></pre>",
            locator: "/component/doc/12",
            siteId: 1,
            title: "newdocs"
        }
    ],
    total: 2
}
```
