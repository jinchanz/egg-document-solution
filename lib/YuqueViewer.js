'use strict';

const { deepMerge } = require('./utils');
const YuqueClient = require('./YuqueClient');
const cache = require('./cache');

const BASE_URL = 'https://www.yuque.com/api/v2';
class YuQueViewer {

  constructor(app) {
    this.app = app;
    this.clientPool = new Map();
    this.config = app.config.yuqueViewer;
    this.init();
  }

  init() {
    const { config } = this;
    const { client, documents = {}, ...otherConfig } = config;
    if (typeof documents === 'object' && Object.keys(documents).length) {
      Object.keys(documents).forEach(key => {
        const config = documents[key];
        const clientConfig = { ...(otherConfig || {}), ...config };
        this.bindRoute(this.aquireClient(key, clientConfig), clientConfig);
      });
      return;
    }
    const clientConfig = { ...(otherConfig || {}) };
    this.bindRoute(this.aquireClient('default', clientConfig), clientConfig);
  }

  mergeConfig(config = {}) {
    this.config = deepMerge(this.config, config);
    this.init();
  }

  aquireClient(name = 'default', config) {
    const { app } = this;
    app.logger.info('[EggYuqueViewer: aquireClient] ', name);
    if (this.clientPool.get(name)) {
      const client = this.clientPool.get(name);
      client.mergeConfig(config);
      return client;
    }
    const client = new YuqueClient(app, config);
    this.clientPool.set(name, client);
    return client;
  }

  get(id) {
    return this.clientPool.get(id);
  }

  bindRoute(yuqueClient, config) {
    if (!Object.keys(config || {}).length) {
      return;
    }
    const { app } = this;
    let view = config.view || '';
    view = view.replace('/*', '');
    if (view === '/') {
      view = '';
    }

    const { prefix, showSearch, lazyLoad, search, baseUrl = BASE_URL, namespace } = config;

    if (showSearch && !search) {
      app.logger.warn('[EggYuqueViewer] show search without search api, search won\'t be shown'.yellow);
    }
    if (lazyLoad && !prefix) {
      throw new Error('prefix required in lazyMode.');
    }

    if (prefix) {
      this.unshiftRoute('GetDocument', `${prefix}/*`, async (ctx, next) => {
        const locator = ctx.request.path.replace(`${prefix}/`, '');
        if (!locator) {
          return;
        }
        if (locator.startsWith('http')) {
          try {
            ctx.redirect(locator);
          } catch (e) {
            ctx.logger.error('redirect failed: %s-%s', e && e.message, e && e.stack);
            ctx.body = `can not redirect to ${locator}, please check domainWhiteList in your config.`;
          }
          return;
        }
        const result = await yuqueClient.getDocument(locator);
        ctx.status = 200;
        ctx.body = result;
        next();
      });
    }

    if (search) {
      this.unshiftRoute(`GetDocumentView-${search}`, `${search}`, async ctx => {
        const keywords = ctx.query.keywords;
        if (!keywords) {
          throw new Error('keywords param required.');
        }
        const result = await yuqueClient.search(keywords);
        ctx.status = 200;
        ctx.body = result;
      });
    }

    this.unshiftRoute(`Static Resources-${view}/js`, `${view}/index.js`, async ctx => {
      return ctx.redirect(`https://cdn.jsdelivr.net/npm/${config.npm}/build/index.js`);
    });
    this.unshiftRoute(`Static Resources-${view}/css`, `${view}/index.css`, async ctx => {
      return ctx.redirect(`https://cdn.jsdelivr.net/npm/${config.npm}/build/index.css`);
    });
    this.unshiftRoute(`GetDocumentView-${view}`, `${view}/*`, async (ctx, next) => {
      const subPath = ctx.request.path.replace(`${view}/`, '');
      if (subPath.startsWith('http')) {
        try {
          ctx.redirect(subPath);
        } catch (e) {
          ctx.logger.error('redirect failed: %s-%s', e && e.message, e && e.stack);
          ctx.body = `can not redirect to ${subPath}, please check domainWhiteList in your config.`;
        }
        return;
      }
      ctx.body = await yuqueClient.getDocumentView();
      next();
    });
    this.unshiftRoute(`GetDocumentView-${view}`, `${view}`, async (ctx, next) => {
      ctx.body = await yuqueClient.getDocumentView();
      next();
    });
    this.unshiftRoute(`GetCache`, `/LIST-ABLULA-DOCUMENT-CACHE`, async (ctx, next) => {
      const data = cache.listAll();
      ctx.body = data;
    });
    this.unshiftRoute(`ClearCache`, `/CLEAR-ABLULA-DOCUMENT-CACHE`, async (ctx, next) => {
      cache.clear();
      ctx.body = 'ok';
    });
    this.unshiftRoute(`UpdateCacheByKey`, `/UPDATE-ABLULA-DOCUMENT-CACHE`, async (ctx, next) => {
      const { data } = ctx.request.body;
      if (!data || !data.slug) {
        ctx.body = {
          status: 'failed',
          message: 'invalid payload',
          payload: data
        };
        return;
      }
      const key = `${baseUrl}/repos/${namespace}/docs/${data.slug}`;
      const originData = cache.get(key) || {};
      cache.set(key, { ...originData, data });
      ctx.body = {
        status: 'success',
        message: 'update cache successfully',
        payload: data
      };
    }, 'post');
  }

  unshiftRoute(name, path, handler, method = 'get') {
    const { app } = this;
    const { router } = app;
    router[method](name, path, handler);
    router.stack.unshift(router.stack.pop());
    app.logger.info('[EggYuqueViewer] bind router: ', `${name} - ${path}`);
  }

}

module.exports = YuQueViewer;
