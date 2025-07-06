const path = require('path');

function setupStatic(app) {
  app.use(require('express').static(path.join(__dirname)));
  app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
  });
  // SPA fallback: serve index.html for all non-API routes
  app.get(/^\/(?!api).*/, (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
  });
}

module.exports = setupStatic;
