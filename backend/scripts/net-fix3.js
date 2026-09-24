const { execSync } = require('child_process');
const net = require('net');
const https = require('https');
const http = require('http');
const fs = require('fs');
function sh(cmd) {
  try { return execSync(cmd, { encoding: 'utf8', timeout: 12000 }).trim(); }
  catch (e) { return ((e.stdout||'') + (e.stderr||e.message)).trim().slice(0,500); }
}
function tcp(host, port, ms=4000) {
  return new Promise((r) => {
    const s = net.connect({ host, port, timeout: ms }, () => { s.destroy(); r('OK'); });
    s.on('error', e => r('FAIL:'+e.code));
    s.on('timeout', () => { s.destroy(); r('TIMEOUT'); });
  });
}
(async () => {
  console.log('netplan', sh('ls /etc/netplan 2>/dev/null; cat /etc/netplan/*.yaml 2>/dev/null'));
  console.log('resolved.conf', sh('cat /etc/systemd/resolved.conf'));
  console.log('gw dns?', await tcp('156.253.5.254', 53));
  console.log('gw 443?', await tcp('156.253.5.254', 443));

  // Iranian / alternate DNS
  for (const ip of ['178.22.122.100','185.51.200.2','10.202.10.10','10.202.10.11','5.201.72.13','5.202.96.13','79.127.127.127']) {
    console.log(`dns ${ip}:53`, await tcp(ip, 53));
    console.log(`dig @${ip}`, sh(`dig +time=2 +tries=1 +tcp @${ip} api.resend.com A +short`));
  }

  // Local-looking services
  console.log('docker ps', sh('docker ps --format "{{.Names}} {{.Ports}}" 2>&1 | head -20'));
  console.log('ss :53', sh('ss -ulnp | grep :53; ss -tlnp | grep :53'));
  console.log('ss :465', sh('ss -tlnp | grep -E ":465|:587|:25" | head'));

  // Can we reach anything outbound on 443?
  const httpsTargets = [
    ['142.250.185.78','www.google.com'], // google
    ['104.20.29.242','api.resend.com'],
    ['172.66.165.132','api.resend.com'],
    ['23.251.234.60','email'], // SES from headers
    ['185.199.108.153','github'],
  ];
  for (const [ip, name] of httpsTargets) {
    console.log(`tcp ${ip}:443 (${name})`, await tcp(ip, 443, 6000));
  }

  // Try HTTPS GET to google by IP
  await new Promise((resolve) => {
    const req = https.request({ host: '142.250.185.78', servername: 'www.google.com', path: '/', method: 'GET', timeout: 8000, lookup: (_h,_o,cb)=>cb(null,'142.250.185.78',4) },
      (res) => { console.log('google https', res.statusCode); res.resume(); resolve(); });
    req.on('error', e => { console.log('google https FAIL', e.code||e.message); resolve(); });
    req.on('timeout', () => { console.log('google https TIMEOUT'); req.destroy(); resolve(); });
    req.end();
  });

  // Known IPs from this server's own services - can we resolve via hosts file content
  console.log('hosts', sh('cat /etc/hosts'));
  console.log('nslookup local mysql?', sh('getent hosts 127.0.0.1'));

  // Can backend reach n8n by hardcoded? check .env
  const env = fs.readFileSync('/root/neshastyar/backend/.env','utf8');
  const wh = (env.match(/^EMAIL_WEBHOOK_URL=(.*)$/m)||[])[1];
  console.log('EMAIL_WEBHOOK_URL', wh);

  process.exit(0);
})();
