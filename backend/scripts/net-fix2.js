const { execSync } = require('child_process');
const dns = require('dns');
const net = require('net');
const https = require('https');
const fs = require('fs');
function sh(cmd) {
  try { return execSync(cmd, { encoding: 'utf8', timeout: 20000 }).trim(); }
  catch (e) { return ((e.stdout||'') + (e.stderr||e.message)).trim(); }
}
(async () => {
  console.log('dig 127.0.0.53:', sh('dig +time=3 +tries=2 @127.0.0.53 api.resend.com A +short'));
  console.log('dig 8.8.8.8:', sh('dig +time=3 +tries=2 @8.8.8.8 api.resend.com A +short'));
  console.log('dig 4.2.2.4:', sh('dig +time=3 +tries=2 @4.2.2.4 api.resend.com A +short'));
  console.log('dig 9.9.9.9:', sh('dig +time=3 +tries=2 @9.9.9.9 api.resend.com A +short'));
  console.log('dig google 8.8.8.8:', sh('dig +time=3 +tries=2 @8.8.8.8 google.com A +short'));
  console.log('dig neshastyar 8.8.8.8:', sh('dig +time=3 +tries=2 @8.8.8.8 neshastyar.com A +short'));

  const ips = ['8.8.8.8','1.1.1.1','4.2.2.4','9.9.9.9','104.20.29.242','172.66.165.132','23.251.234.60','156.253.5.254'];
  for (const ip of ips) {
    for (const port of [53, 443, 80]) {
      if (port === 53 && !['8.8.8.8','1.1.1.1','4.2.2.4','9.9.9.9'].includes(ip)) continue;
      await new Promise((r) => {
        const s = net.connect({ host: ip, port, timeout: 5000 }, () => {
          console.log(`tcp ${ip}:${port} OK`); s.destroy(); r();
        });
        s.on('error', (e) => { console.log(`tcp ${ip}:${port} FAIL ${e.code}`); r(); });
        s.on('timeout', () => { console.log(`tcp ${ip}:${port} TIMEOUT`); s.destroy(); r(); });
      });
    }
  }

  // Try HTTPS to Resend with pinned IP
  await new Promise((resolve) => {
    const req = https.request({
      host: '104.20.29.242', servername: 'api.resend.com', port: 443, path: '/domains', method: 'GET',
      headers: { Authorization: 'Bearer ' + (fs.readFileSync('/root/neshastyar/backend/.env','utf8').match(/^RESEND_API_KEY=(.*)$/m)||[])[1], 'User-Agent': 'neshastyar-fix/1.0' },
      timeout: 15000,
      lookup: (_h,_o,cb) => cb(null, '104.20.29.242', 4),
    }, (res) => {
      let d=''; res.on('data',c=>d+=c); res.on('end',()=>{ console.log('https resend status', res.statusCode, d.slice(0,200)); resolve(); });
    });
    req.on('error', e => { console.log('https resend FAIL', e.code||e.message); resolve(); });
    req.on('timeout', () => { console.log('https resend TIMEOUT'); req.destroy(); resolve(); });
    req.end();
  });

  // Try n8n / teraxr
  console.log('dig teraxr:', sh('dig +time=3 +tries=2 @8.8.8.8 n8nnew.teraxr.com A +short'));
  process.exit(0);
})();
