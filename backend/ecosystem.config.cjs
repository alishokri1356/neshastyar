module.exports = {
  apps: [{
    name: 'neshastyar-backend',
    cwd: '/root/neshastyar/backend',
    script: 'src/server.js',
    interpreter: 'node',
    env: {
      NODE_ENV: 'production',
      // Explicitly clear proxies
      HTTP_PROXY: '',
      HTTPS_PROXY: '',
      http_proxy: '',
      https_proxy: '',
      ALL_PROXY: '',
      all_proxy: '',
    },
  }],
};
