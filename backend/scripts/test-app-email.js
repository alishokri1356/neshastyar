const { execSync } = require('child_process');
const http = require('http');
const fs = require('fs');

// Persist cloud-init disable
fs.mkdirSync('/etc/cloud/cloud.cfg.d', { recursive: true });
fs.writeFileSync('/etc/cloud/cloud.cfg.d/99-disable-network-config.cfg', 'network: {config: disabled}\n');
console.log('cloud-init network config disabled');
console.log('netplan:\n' + fs.readFileSync('/etc/netplan/50-cloud-init.yaml','utf8'));
console.log('route:\n' + execSync('ip route').toString());

function post(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request({
      host: '127.0.0.1', port: 3001, path, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
      timeout: 30000,
    }, (res) => {
      let d=''; res.on('data',c=>d+=c); res.on('end',()=>resolve({status:res.statusCode, body:d}));
    });
    req.on('error', reject);
    req.write(data); req.end();
  });
}

(async () => {
  const health = await new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:3001/health', (res) => {
      let d=''; res.on('data',c=>d+=c); res.on('end',()=>resolve({status:res.statusCode, body:d}));
    }).on('error', reject);
  });
  console.log('health', health);

  const reset = await post('/api/auth/request-password-reset', { email: 'alishokri@yahoo.com' });
  console.log('password-reset', reset);

  const resend = await post('/api/auth/resend-verification', { email: 'alishokri@yahoo.com' });
  console.log('resend-verification', resend);

  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
