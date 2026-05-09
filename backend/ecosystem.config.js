module.exports = {
  apps: [
    {
      name: 'rawyan-erp-api',
      script: 'server.js',
      cwd: __dirname,
      instances: process.env.PM2_INSTANCES || 1,
      exec_mode: 'fork',
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: process.env.PORT || 5000,
      },
      max_memory_restart: '700M',
      time: true,
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      merge_logs: true,
    },
  ],
};
