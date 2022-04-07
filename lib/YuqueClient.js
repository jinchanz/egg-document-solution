'use strict';

const assert = require('assert');
const { deepMerge } = require('./utils');
const cache = require('./cache');
const BASE_URL = 'https://www.yuque.com/api/v2';

class LarkService {
  static getMiniIndex(content, segments) {
    let miniIndex = 0;
    if (segments && segments.length && content) {
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
        locator: item.target && item.target.slug,
        searchEngine: 1,
      };
    });
  }

  static formatDirs(dirs) {
    assert(dirs && Array.isArray(dirs), 'dirs param must be an un-empty array');
    let category;
    const result = [];
    dirs.forEach(dir => {
      if (dir.depth === 1) {
        category = dir.title;
      }
      result.push({
        name: dir.title,
        cnName: dir.title,
        locator: dir.slug,
        category,
        ...dir,
      });
    });
    return result;
  }

  constructor(app, config) {
    this.app = app;
    this.config = config;
    this.baseUrl = config.baseUrl || BASE_URL;
  }

  mergeConfig(config) {
    this.config = deepMerge(this.config, config);
    this.baseUrl = config.baseUrl || BASE_URL;
  }

  async getUserInfo() {
    const { app, config } = this;
    if (!config.user) {
      return {};
    }
    const namespace = config.namespace;
    const docs = await this.request(`${this.baseUrl}/users/${config.user}`);
    if (!docs || !docs.data) {
      throw new Error(`Get directories from lark failed, namespace: ${namespace}`);
    }
    if (typeof docs.data.description === 'string') {
      try {
        docs.data.description = JSON.parse(docs.data.description);
      } catch (e) {
        app.logger.error('[EggYuqueViewer] parse user info failed: ', e);
      }
    }
    app.logger.info('[EggYuqeuViewer] getDirectories SUCCESSFULLY');
    return docs.data;
  }

  async getDocuments() {
    const { app, config } = this;
    const namespace = config.namespace;
    const docs = await this.request(`${this.baseUrl}/repos/${namespace}/docs?include_hits=true`);
    if (!docs || !docs.data) {
      throw new Error(`Get directories from lark failed, namespace: ${namespace}`);
    }
    app.logger.info('[EggYuqeuViewer] getDirectories SUCCESSFULLY');
    const documents = docs.data;
    if (!documents || !documents.length) {
      return [];
    }
    return documents.map(document => {
      return {
        id: document.id,
        title: document.title,
        slug: document.slug,
        hits: document.hits,
        created_at: document.created_at,
        updated_at: document.updated_at,
        content_updated_at: document.content_updated_at,
      };
    });
  }

  async getDocumentView(hotConfig) {
    if (hotConfig) {
      this.mergeConfig(hotConfig);
    }
    const { config } = this;
    if (config.view === '/') {
      config.view = '';
    }
    let directories,
      documents,
      userInfo;
    [ directories, documents ] = await Promise.all([
      this.getDirectories(),
      this.getDocuments(),
    ]);
    if (config.user) {
      userInfo = await this.getUserInfo();
    }

    if (directories.length <= 20) {
      directories = await Promise.all(directories.map(async directory => {
        directory.document = await this.getDocument(directory.locator);
        return directory;
      }));
    }
    const themeStyleTag = config.themeStyle && `<link href="${config.themeStyle}" rel="stylesheet">` || null;
    const npmCssUrl = config.npmCssUrl || `https://cdn.jsdelivr.net/npm/${config.npm}/build/index.css`;
    const npmJsUrl = config.npmJsUrl || `https://cdn.jsdelivr.net/npm/${config.npm}/build/index.js`;
    return `<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
    <title>${config.title || 'Ablula-Yuque'}</title>
    <link rel="shortcut icon" href="${config.favicon || 'favicon.ico'}">
    <link href="${npmCssUrl}" rel="stylesheet">
    ${themeStyleTag || ''}
  </head>
  <body>
    <noscript>
      You need to enable JavaScript to run this app.
    </noscript>
    <div id="mountNode"></div>
    <script>window.__INITIAL_STATE__ = ${JSON.stringify(Object.assign({
    api: config.prefix,
    searchAPI: config.search,
    directories,
    documents: documents || [],
    userInfo: userInfo || {},
  }, config, { token: null }))}</script>
    <script src="${npmJsUrl}"></script>
</html>`;
  }

  async getDirectories() {
    const { app, config } = this;
    const namespace = config.namespace;
    const dirs = await this.request(`${this.baseUrl}/repos/${namespace}/toc`);

    if (!dirs || !dirs.data) {
      throw new Error(`Get directories from lark failed, namespace: ${namespace}`);
    }
    app.logger.info('[EggYuqeuViewer: getDirectories] SUCCESSFULLY');
    return LarkService.formatDirs(dirs.data);
  }

  async getDocument(locator) {
    assert(locator, 'locator param can not be empty');
    const { app, config } = this;
    const url = `${this.baseUrl}/repos/${config.namespace}/docs/${locator}`;
    try {
      const result = await this.request(url);
      if (!result || !result.data) {
        app.logger.error(`[EggYuqeuViewer: getDocument] Get document from lark failed, groupId: ${config.namespace}, locator: ${locator}`);
        return {
          locator,
          title: '',
          data: '',
          creator: '',
        };
      }
      app.logger.info('[EggYuqeuViewer: getDocument] SUCCESSFULLY');
      const data = result && result.data || {};
      const content = (data.body_html || '').replace(/<img/g, '<img referrerpolicy="no-referrer"');
      return {
        locator,
        title: data.title,
        data: content,
        creator: data.creator && data.creator.name,
        created_at: data.created_at,
        updated_at: data.updated_at,
        published_at: data.published_at,
        word_count: data.word_count,
        likes_count: data.likes_count,
        comments_count: data.comments_count,
        hits: data.hits,
      };
    } catch (e) {
      app.logger.error('[EggYuqeuViewer: getDocument] getDocument failed: ' + e.message);
      return {
        locator,
        title: '',
        data: '',
        creator: '',
      };
    }
  }

  async search(keywords) {
    const { config } = this;
    const result = await this.request(
      `${this.baseUrl}/search/?q=${encodeURIComponent(keywords)}&type=doc&scope=${config.namespace}`);
    const data = LarkService.formatSearchResult(result.data, {
      segments: [ keywords ],
      namespace: config.namespace,
    });
    return {
      total: data.length,
      segments: [ keywords ],
      data,
    };
  }

  async request(url) {
    const { app, config } = this;
    if (cache.get(url)) {
      app.logger.info('[EggYuqeuViewer] get data of %s from cache', url);
      return cache.get(url);
    }
    app.logger.info('[EggYuqeuViewer] get data of %s from yuque', url);
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
    if (result && +result.status === 429) {
      app.logger.error('当前资源 %s 的访问频率过高，请稍后再试', url);
    }
    if (result.status !== 200 || !result.data) {
      throw new Error(`request document from lark failed, url: ${url}`);
    }
    cache.set(url, {...result.data});
    return result.data;
  }
}

module.exports = LarkService;
