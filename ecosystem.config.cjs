module.exports = {
  apps: [
    {
      name: "mrds",
      script: "npm",
      args: "run start",
      cwd: __dirname,
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      env: {
        NODE_ENV: "production",
        PORT: 3001,
        PATH: "/usr/bin:/usr/local/bin:" + (process.env.PATH || ""),
      },
    },
  ],
};
