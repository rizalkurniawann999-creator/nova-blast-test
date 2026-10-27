require('dotenv').config();
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const apiRouter = require('./routes/api');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const allowedOrigins = (process.env.CORS_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean);

app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin(origin, callback) {
  // No Origin is typical for same-origin requests and local command-line checks.
  if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) return callback(null, true);
  return callback(new Error('Origin tidak diizinkan oleh CORS.'));
}}));
app.use(express.json({ limit: '100kb' }));
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false }));
app.use('/api', apiRouter);
app.use(express.static(path.join(__dirname, '..', 'public')));
app.get('*', (_req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'index.html')));
app.use((err, _req, res, _next) => {
  if (err.message && err.message.startsWith('Origin tidak diizinkan')) return res.status(403).json({ error: err.message });
  console.error(err);
  res.status(500).json({ error: 'Kesalahan server.' });
});
app.listen(PORT, '0.0.0.0', () => console.log(`NOVA BLAST API berjalan di http://0.0.0.0:${PORT}`));
  
