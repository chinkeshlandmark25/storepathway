const express = require('express');
const bodyParser = require('body-parser');
const apiRouter = require('./api');
const setupStatic = require('./server');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(express.static('public'))

// Mount API routes under /api
app.use('/api', apiRouter);

// Setup static file serving
setupStatic(app);

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
