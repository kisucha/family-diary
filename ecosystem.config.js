module.exports = {
  apps: [
    {
      name: 'family-diary',
      script: 'npm',
      args: 'run dev',
      cwd: '/opt/family-diary',
      watch: false,
      instances: 1,
      autorestart: true,
      max_restarts: 10,
      env: {
        NODE_ENV: 'development',
        PORT: 4000,
      },
    },
  ],
};
