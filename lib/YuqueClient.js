'use strict';

const assert = require('assert');

const BASE_URL = 'https://www.yuque.com/api/v2';

class LarkService {
  static getMiniIndex(content, segments) {
    let miniIndex = 0;
    if (segments && segments.length) {
      miniIndex = segments.map(regexp => {
        const idx = content.search(regexp);
        return idx > 0 ? idx : 0;
      }).reduce((previous, current) => {
        if (current === 0) {
          return previous;
        }
        return (current < previous || previous === 0) ? current : previous;
      });
    }
    return miniIndex;
  }
  static formatSearchResult(data, options) {
    let segments = options.segments;
    if (segments && segments.length) {
      segments = segments.map(segment => new RegExp(segment, 'i'));
    }
    return data.map(item => {
      const startIndex = LarkService.getMiniIndex(item.summary, segments);
      const content = (item.summary || '').substr(startIndex, 999);
      return {
        id: item.id,
        content,
        category: options.namespace,
        title: item.title,
        locator: item.target.slug,
        searchEngine: 1,
      };
    });
  }

  static formatDirs(dirs) {
    assert(dirs && Array.isArray(dirs), 'dirs param must be a non empty array');
    let category;
    const result = [];
    dirs.forEach(dir => {
      if (dir.depth === 1) {
        category = dir.title;
      }
      if (dir.slug !== '#') {
        result.push({
          name: dir.title,
          cnName: dir.title,
          locator: dir.slug,
          category,
        });
      }
    });
    return result;
  }

  constructor(app, config) {
    this.app = app;
    this.config = config;
    this.baseUrl = config.baseUrl || BASE_URL;
  }

  async getDocumentView() {
    const { config } = this;
    const directories = await this.getDirectories();
    return `<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8">
    <link rel="icon" href="https://img.alicdn.com/tps/TB1kBU7NpXXXXXLXXXXXXXXXXXX-160-160.png" type="image/x-icon">
    <link rel="shortcut icon" href="https://img.alicdn.com/tps/TB1kBU7NpXXXXXLXXXXXXXXXXXX-160-160.png">
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
    <title>${config.title || 'Ablula-Yuque'}</title>
    <link href="https://cdn.jsdelivr.net/npm/${config.npm}/build/index.css" rel="stylesheet"></head>
  <body>
    <noscript>
      You need to enable JavaScript to run this app.
    </noscript>
    <div id="mountNode"></div>
    <script>window.__INITIAL_STATE__ = ${JSON.stringify(Object.assign({
    api: config.prefix,
    searchAPI: config.search,
    directories,
  }, config))}</script>
    <script src="https://cdn.jsdelivr.net/npm/${config.npm}/build/index.js"></script>
</html>`;
  }

  async getDirectories() {
    const { app, config } = this;
    console.log('config: ', config);
    const namespace = config.namespace;
    const dirs = await this.request(`${this.baseUrl}/repos/${namespace}/toc`);

    if (!dirs || !dirs.data) {
      throw new Error(`Get directories from lark failed, namespace: ${namespace}`);
    }
    app.logger.info('getDirectories SUCCESSFULLY');
    return LarkService.formatDirs(dirs.data);
  }

  async getDocument(locator) {
    assert(locator, 'locator param can not be empty');
    const { app, config } = this;
    const url = `${this.baseUrl}/repos/${config.namespace}/docs/${locator}`;
    const result = await this.request(url);
    if (!result || !result.data) {
      app.logger.error(`Get document from lark failed, groupId: ${config.namespace}, locator: ${locator}`);
      return {
        locator,
        title: '',
        data: '',
        creator: '',
      };
    }
    app.logger.info('getDocument SUCCESSFULLY');
    const data = result && result.data || {};
    const content = (data.body_html || '').replace(/<img/g, '<img referrerpolicy="no-referrer"');
    return {
      locator,
      title: data.title,
      data: content,
      creator: data.creator && data.creator.name,
    };
  }

  async search(keywords) {
    const { config } = this;
    const result = await this.request(
      `${this.baseUrl}/search/?q=${encodeURIComponent(keywords)}&type=doc&scope=${config.namespace}`);
    result.data = LarkService.formatSearchResult(result.data, {
      segments: [ keywords ],
      namespace: config.namespace,
    });
    return {
      total: result.data.length,
      segments: [ keywords ],
      data: result.data,
    };
  }

  async request(url) {
    const { app, config } = this;
    const result = await app.curl(url, {
      timeout: 5000,
      dataType: 'json',
      followRedirect: true,
      enableDNSCache: true,
      headers: {
        'User-Agent': '@ablula/egg-yuque-viewer',
        'X-Auth-Token': config.token,
      },
    });
    if (result.status !== 200 || !result.data) {
      throw new Error(`Search document from lark failed, url: ${url}`);
    }
    return result.data;
  }
}

module.exports = LarkService;
