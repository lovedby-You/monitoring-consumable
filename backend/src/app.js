const fs = require('fs');
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const env = require('./config/env');
const { notFound, errorHandler } = require('./middleware/error');

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', env.TRUST_PROXY);
// 'upgrade-insecure-requests' dimatikan agar aplikasi tetap bisa dibuka lewat http://localhost
app.use(
  helmet({
    contentSecurityPolicy: { useDefaults: true, directives: { 'upgrade-insecure-requests': null } },
  }),
);
app.use(cors({ origin: env.corsOrigins, credentials: true }));
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());
if (env.NODE_ENV !== 'test') app.use(morgan(env.isProd ? 'combined' : 'dev'));
app.use(
  '/api',
  rateLimit({ windowMs: 60 * 1000, limit: 300, standardHeaders: true, legacyHeaders: false }),
);

app.get('/api/health', (_req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

const v1 = express.Router();
v1.use('/auth', require('./modules/auth/auth.routes'));
v1.use('/consumables', require('./modules/consumables/consumables.routes'));
const { stockInRouter, stockOutRouter } = require('./modules/stock');
v1.use('/stock-in', stockInRouter);
v1.use('/stock-out', stockOutRouter);
v1.use('/daily-orders', require('./modules/daily-orders/daily-orders.routes'));
v1.use('/monitoring', require('./modules/monitoring/monitoring.routes'));
v1.use('/dashboard', require('./modules/dashboard/dashboard.routes'));
app.use('/api/v1', v1);

// Sajikan tampilan frontend (hasil `npm run build`) dari server yang sama bila foldernya ada.
// Dengan begitu cukup satu alamat/port, dan cookie login tidak lintas domain.
const dist = env.FRONTEND_DIST || path.resolve(__dirname, '../../frontend/dist');
if (fs.existsSync(path.join(dist, 'index.html'))) {
  app.use(express.static(dist));
  app.get(/^\/(?!api(\/|$)).*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.use(notFound);
app.use(errorHandler);
module.exports = app;
