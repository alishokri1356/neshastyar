const { execSync } = require('child_process');
const dns = require('dns');
const net = require('net');
const https = require('https');
const fs = require('fs');

function sh(cmd) {
  try { return execSync(cmd, { encoding: 'utf8', timeout: 15000 }).trim(); }
  catch (e) { return (e.stdout || '') + (e.stderr || e.message); }
}

console.log('=== ip addr ===');
console.log(sh('ip -br addr'));
console.log('=== ip route ===');
console.log(sh('ip route'));
console.log('=== resolv.conf ===');
console.log(sh('ls -la /etc/resolv.conf; cat /etc/resolv.conf'));
console.log('=== systemd-resolved ===');
console.log(sh('systemctl is-active systemd-resolved; systemctl status systemd-resolved --no-pager -l | head -25'));
console.log('=== resolvectl ===');
console.log(sh('resolvectl status 2>&1 | head -50'));

(async () => {
  console.log('=== dns lookups ===');
  for (const h of ['api.resend.com', 'mail.neshastyar.com', 'neshastyar.com', 'google.com', '1.1.1.1']) {
    try {
      const a = await dns.promises.lookup(h);
      console.log('OK', h, a.address);
    } catch (e) {
      console.log('FAIL', h, e.code || e.message);
    }
  }

  console.log('=== dig ===');
  console.log(sh('dig +time=2 +tries=1 @127.0.0.53 api.resend.com A +short 2>&1'));
  console.log(sh('dig +time=2 +tries=1 @1.1.1.1 api.resend.com A +short 2>&1'));
  console.log(sh('dig +time=2 +tries=1 @8.8.8.8 api.resend.com A +short 2>&1'));

  console.log('=== tcp ===');
  for (const [h, p] of [['1.1.1.1', 53], ['8.8.8.8', 53], ['1.1.1.1', 443], ['104.20.29.242', 443], ['127.0.0.53', 53]]) {
    await new Promise((r) => {
      const s = net.connect({ host: h, port: p, timeout: 4000 }, () => {
        console.log(`tcp ${h}:${p} OK`);
        s.destroy();
        r();
      });
      s.on('error', (e) => { console.log(`tcp ${h}:${p} FAIL ${e.code}`); r(); });
      s.on('timeout', () => { console.log(`tcp ${h}:${p} TIMEOUT`); s.destroy(); r(); });
    });
  }

  console.log('=== DONE ===');
  process.exit(0);
})();
