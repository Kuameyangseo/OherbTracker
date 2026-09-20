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
      script: 'npm',
      args: 'run dev:pm2',
      interpreter: 'none',
      autorestart: true,
      watch: false,
      error_file: './.pm2-logs/oherb-tracker-web-error.log',
      out_file: './.pm2-logs/oherb-tracker-web-out.log',
      time: true,
      env: {
        NODE_ENV: 'development',
        HOSTNAME: '0.0.0.0',
        PORT: 3100,
      },
    },
  ],
};
