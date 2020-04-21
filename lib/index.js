'use strict';

const YuqueClient = require('./YuqueClient');

module.exports = app => {

  const { router, config } = app;

  app.addSingleton('yuqueViewer', async (config, app) => {
    return new YuqueClient(app);
  });
  const _config = config.yuqueViewer;
  const yuqueClient = new YuqueClient(app, _config);
  const search = _config.search;
  if (search) {
    router.get(`GetDocumentView-${search}`, `${search}`, async (ctx, next) => {
      const keywords = ctx.query.keywords;
      if (!keywords) {
        throw new Error('keywords param required.');
      }
      const result = await yuqueClient.search(keywords);
      ctx.status = 200;
      ctx.body = result;
    });
  }

  const view = _config.view;
  const prefix = _config.prefix;
  const showSearch = _config.showSearch;
  const lazyLoad = _config.lazyLoad;

  if (view) {
    if (showSearch && !search) {
      console.warn('show search without search api, search won\'t be shown'.yellow);
    }
    if (lazyLoad && !prefix) {
      throw new Error('prefix required in lazyMode.');
    }

    router.get('GetDocument', `${prefix}/*`, async (ctx, next) => {
      const locator = ctx.request.path.split(`${prefix}/`)[1];
      const result = await yuqueClient.getDocument(locator);
      ctx.status = 200;
      ctx.body = result;
      next();
    });

    router.get(`Static Resources-${view}/js`, `${view}/index.js`, async ctx => {
      return ctx.redirect(`https://cdn.jsdelivr.net/npm/${_config.npm}/build/index.js`);
    });
    router.get(`Static Resources-${view}/css`, `${view}/index.css`, async ctx => {
      return ctx.redirect(`https://cdn.jsdelivr.net/npm/${_config.npm}/build/index.css`);
    });

    router.get(`GetDocumentView-${view}`, `${view}`, async (ctx, next) => {
      ctx.body = await yuqueClient.getDocumentView();
      next();
    });
  }
};
