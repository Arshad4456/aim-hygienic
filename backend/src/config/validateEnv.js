const REQUIRED_IN_PRODUCTION = ['MONGODB_URI', 'JWT_SECRET', 'FRONTEND_URL'];
const STRONGLY_RECOMMENDED = [
  'CORS_ORIGIN',
  'CLOUDFLARE_R2_ACCOUNT_ID',
  'CLOUDFLARE_R2_BUCKET',
  'CLOUDFLARE_R2_ACCESS_KEY_ID',
  'CLOUDFLARE_R2_SECRET_ACCESS_KEY',
  'CLOUDFLARE_R2_PUBLIC_BASE_URL',
];

function mask(value = '') {
  if (!value) return '';
  const str = String(value);
  if (str.length <= 8) return '***';
  return `${str.slice(0, 4)}***${str.slice(-4)}`;
}

function getEnvironmentStatus(env = process.env) {
  const isProduction = env.NODE_ENV === 'production';
  const required = REQUIRED_IN_PRODUCTION.map((key) => ({ key, ok: Boolean(env[key]) }));
  const recommended = STRONGLY_RECOMMENDED.map((key) => ({ key, ok: Boolean(env[key]) }));
  const missingRequired = required.filter((item) => !item.ok).map((item) => item.key);
  const missingRecommended = recommended.filter((item) => !item.ok).map((item) => item.key);

  return {
    isProduction,
    ok: !isProduction || missingRequired.length === 0,
    missingRequired,
    missingRecommended,
    safeConfig: {
      nodeEnv: env.NODE_ENV || 'development',
      port: env.PORT || '5000',
      frontendUrl: env.FRONTEND_URL || '',
      corsOrigin: env.CORS_ORIGIN || '',
      mongoConfigured: Boolean(env.MONGODB_URI),
      mongoPreview: mask(env.MONGODB_URI),
      r2Configured: STRONGLY_RECOMMENDED.filter((key) => key.startsWith('CLOUDFLARE_R2_')).every((key) => Boolean(env[key])),
    },
  };
}

function validateEnvironment(env = process.env) {
  const status = getEnvironmentStatus(env);
  if (!status.ok) {
    const message = `Missing production environment variables: ${status.missingRequired.join(', ')}`;
    if (env.FAIL_ON_MISSING_ENV === 'true') throw new Error(message);
    console.warn(`⚠️  ${message}`);
  }
  if (status.missingRecommended.length) {
    console.warn(`⚠️  Recommended environment variables not set: ${status.missingRecommended.join(', ')}`);
  }
  return status;
}

module.exports = { getEnvironmentStatus, validateEnvironment };
