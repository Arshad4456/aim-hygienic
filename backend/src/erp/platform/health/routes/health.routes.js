const express = require('express');
const mongoose = require('mongoose');
const { APP_BRAND } = require('../../../../config/brand');
const { getEnvironmentStatus } = require('../../../../config/validateEnv');

const router = express.Router();

function dbState() {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  return states[mongoose.connection.readyState] || `unknown:${mongoose.connection.readyState}`;
}

router.get('/', (req, res) => {
  res.json({
    ok: true,
    service: APP_BRAND.serviceName,
    name: APP_BRAND.name,
    time: new Date().toISOString(),
    db: dbState(),
  });
});

router.get('/ready', (req, res) => {
  const env = getEnvironmentStatus(process.env);
  const databaseConnected = mongoose.connection.readyState === 1;
  const ready = env.ok && databaseConnected;
  res.status(ready ? 200 : 503).json({
    ok: ready,
    service: APP_BRAND.serviceName,
    name: APP_BRAND.name,
    db: dbState(),
    environment: env,
    checks: {
      databaseConnected,
      environmentReady: env.ok,
      uploadsConfigured: env.safeConfig.r2Configured,
    },
    time: new Date().toISOString(),
  });
});

module.exports = router;
