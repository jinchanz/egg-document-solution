'use strict';

const YuqueViewer = require('./YuqueViewer');

module.exports = app => {

  const { config: appConfig } = app;
  const { yuqueViewer } = appConfig;
  if (!yuqueViewer) {
    app.logger.error('[EggYuqueViewer: init]: yuqueViewer is required in app config, but got null.');
    return;
  }
  // 本插件不使用 egg 插件中推荐的 clients 方式
  if (!yuqueViewer.client) {
    appConfig.yuqueViewer.client = {};
  }
  if (yuqueViewer.clients) {
    delete yuqueViewer.clients;
  }

  app.addSingleton('yuqueViewer', (config, app) => {
    return new YuqueViewer(app);
  });
};
