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
|title|String|帮助文档| 文档页面 title |
|logo|String|https://gw.alipayobjects.com/mdn/prod_resou/afts/img/A*OwZWQ68zSTMAAAAAAAAAAABkARQnAQ |文档页面 logo |
|showSearch|String|true| 是否显示搜索框 |
|lazyLoad|bool|false| 文档页面是否懒加载 |
|showEditor|bool|false|是否显示跳转到语雀编辑的 icon |
|token|String|''|语雀 token |
|darkMode|bool|true|header 的 dark/light 模式|
|lightColor|String|'#ffffff00'|header 的 light 模式 的颜色|
|blackColor|String|'black'|header 的 dark 模式 的颜色|

### Examples

#### plugin.js

```js
exports.yuqueViewer = {
  enable: true,
  package: '@ablula/egg-yuque-viewer',
};
```

#### config.default.js

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
  logo: 'https://gw.alipayobjects.com/mdn/prod_resou/afts/img/A*OwZWQ68zSTMAAAAAAAAAAABkARQnAQ',
};
```

## 使用

### 直接访问
根据上述配置中的 view 可以直接访问对应页面，例如服务启动的地址为：`http://localhost:3333` ，view 配置为 `/documents`，则文档访问 url 为：`http://localhost:3333/documents`

### 方法调用
#### app.yuqueViewer

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
