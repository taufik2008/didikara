module.exports = {
  apps: [
    {
      name: "lms-app",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000",
      instances: "max", // Cluster mode: gunakan semua CPU cores server
      exec_mode: "cluster",
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      error_file: "./logs/pm2-error.log",
      out_file: "./logs/pm2-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
    },
  ],
};
