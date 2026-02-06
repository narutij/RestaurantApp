module.exports = {
  apps: [
    {
      name: "restaurant-app",
      script: "dist/index.js",
      cwd: "/opt/restaurant-app",
      node_args: "--experimental-specifier-resolution=node",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      // Auto-restart on crash
      autorestart: true,
      watch: false,
      // Restart if memory exceeds 512MB
      max_memory_restart: "512M",
      // Graceful restart
      kill_timeout: 5000,
      wait_ready: false,
      // Logs
      error_file: "/var/log/restaurant-app/error.log",
      out_file: "/var/log/restaurant-app/out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,
      // Restart delay on crash (1 second)
      restart_delay: 1000,
      // Max restarts in 15 min window before stopping
      max_restarts: 15,
      min_uptime: "10s",
    },
  ],
};
