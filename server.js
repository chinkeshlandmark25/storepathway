const path = require('path');
const express = require('express');
const cors = require('cors');
const app = express();
const apiRouter = require('./api/routes');
const PORT = 8080;

app.use(cors({
  origin: '*',
  credentials: true
}));
app.use(express.json());

// Mount API router at /api
app.use('/api', apiRouter);

// Serve static files and SPA fallback
app.use(express.static(path.join(__dirname)));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});
app.get(/^\/(?!api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
});
