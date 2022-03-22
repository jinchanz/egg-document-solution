'use strict';

const YuqueClient = require('./YuqueClient');

function bindRoute(app, router, config) {
  const yuqueClient = new YuqueClient(app, config);

  let view = config.view || '';
  if (view === '/') {
    view = '';
  }

  const { prefix, showSearch, lazyLoad, search } = config;

  if (showSearch && !search) {
    console.warn('show search without search api, search won\'t be shown'.yellow);
  }
  if (lazyLoad && !prefix) {
    throw new Error('prefix required in lazyMode.');
  }

  if (search) {
    router.get(`GetDocumentView-${search}`, `${search}`, async ctx => {
      const keywords = ctx.query.keywords;
      if (!keywords) {
        throw new Error('keywords param required.');
      }
      const result = await yuqueClient.search(keywords);
      ctx.status = 200;
      ctx.body = result;
    });
  }

  router.get('GetDocument', `${prefix}/*`, async (ctx, next) => {
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

  router.get(`Static Resources-${view}/js`, `${view}/index.js`, async ctx => {
    return ctx.redirect(`https://cdn.jsdelivr.net/npm/${config.npm}/build/index.js`);
  });
  router.get(`Static Resources-${view}/css`, `${view}/index.css`, async ctx => {
    return ctx.redirect(`https://cdn.jsdelivr.net/npm/${config.npm}/build/index.css`);
  });

  router.get(`GetDocumentView-${view}`, `${view}`, async (ctx, next) => {
    ctx.body = await yuqueClient.getDocumentView();
    next();
  });

  router.get(`GetDocumentView-${view}`, `${view}/*`, async (ctx, next) => {
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
}

module.exports = app => {

  app.addSingleton('yuqueViewer', async (config, app) => {
    const { yuqueViewer: yuqueViewerConfig = {} } = config || {};
    const { documents, otherConfig } = yuqueViewerConfig;
    if (!documents) {
      return new YuqueClient(app, yuqueViewerConfig);
    }
    const yuqueClientMap = {};
    Object.keys(documents).forEach(item => {
      yuqueClientMap[item] = new YuqueClient(app, {
        ...otherConfig,
        ...item,
      });
    });
  });

  const { router, config: appConfig } = app;
  const config = appConfig.yuqueViewer;

  const { documents, ...otherConfig } = config;
  if (typeof documents === 'object' && Object.values(documents).length) {
    Object.values(documents).forEach(item => {
      bindRoute(app, router, {
        ...otherConfig,
        ...item,
      });
    });
    return;
  }

  bindRoute(app, router, config);
};
