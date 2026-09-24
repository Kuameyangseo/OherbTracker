const path = require('path');

module.exports = {
  namespace: 'oherb-tracker',
  apps: [
    {
      name: 'oherb-tracker-api',
      cwd: './',
      script: './apps/api/dist/main.js',
      interpreter: 'node',
      node_args: '-r dotenv/config',
      autorestart: true,
      watch: false,
      error_file: './.pm2-logs/oherb-tracker-api-error.log',
      out_file: './.pm2-logs/oherb-tracker-api-out.log',
      time: true,
      env: {
        HOST: '0.0.0.0',
        PORT: 3333,
      },
    },
    {
      name: 'oherb-tracker-web',
      cwd: './apps/web',
      script: './node_modules/next/dist/bin/next',
      args: 'dev -p 3100',
      interpreter: 'node',
      windowsHide: true,
      autorestart: true,
      watch: false,
      error_file: path.join(__dirname, '.pm2-logs/oherb-tracker-web-error.log'),
      out_file: path.join(__dirname, '.pm2-logs/oherb-tracker-web-out.log'),
      time: true,
      env: {
        NODE_ENV: 'development',
        HOSTNAME: '0.0.0.0',
        PORT: 3100,
      },
    },
  ],
};
