module.exports = {
  apps: [
    {
      name: 'family-diary',
      script: 'node_modules/.bin/next',
      args: 'start -p 4000',
      cwd: '/opt/family-diary',
      watch: false,
      instances: 1,
      autorestart: true,
      max_restarts: 10,
      env: {
        NODE_ENV: 'production',
        PORT: 4000,
      },
    },
  ],
};
