const { execSync } = require('child_process');
const https = require('https');
const dns = require('dns');
const fs = require('fs');
function sh(cmd) {
  console.log('$', cmd);
  try { const o = execSync(cmd, { encoding: 'utf8', timeout: 30000 }); console.log(o.trim()); return o; }
  catch (e) { console.log(((e.stdout||'')+(e.stderr||e.message)).trim()); throw e; }
}
(async () => {
  // Backup netplan
  sh('cp -a /etc/netplan/50-cloud-init.yaml /etc/netplan/50-cloud-init.yaml.bak.$(date +%Y%m%d%H%M%S)');

  // Immediate fix: default route with working source IP
  sh('ip route replace default via 156.253.5.254 dev eth0 src 195.248.240.30');
  console.log('=== route after ===');
  sh('ip route');

  console.log('=== ping primary src ===');
  try { sh('ping -c 1 -W 2 -I 156.253.5.234 8.8.8.8'); } catch {}
  console.log('=== ping default (should use 195.248) ===');
  sh('ping -c 2 -W 2 8.8.8.8');

  console.log('=== dig ===');
  sh('dig +time=3 +tries=2 @8.8.8.8 api.resend.com A +short');
  sh('dig +time=3 +tries=2 api.resend.com A +short');

  // Persist in netplan
  const path = '/etc/netplan/50-cloud-init.yaml';
  let yaml = fs.readFileSync(path, 'utf8');
  if (!yaml.includes('from:')) {
    yaml = yaml.replace(
      /routes:\n(\s+)- to: "default"\n\s+via: "156\.253\.5\.254"/,
      'routes:\n$1- to: "default"\n$1  via: "156.253.5.254"\n$1  from: "195.248.240.30"'
    );
    // fallback simpler replace
    if (!yaml.includes('from:')) {
      yaml = yaml.replace(
        'via: "156.253.5.254"',
        'via: "156.253.5.254"\n          from: "195.248.240.30"'
      );
    }
    fs.writeFileSync(path, yaml);
    console.log('=== netplan updated ===');
    console.log(fs.readFileSync(path,'utf8'));
    sh('netplan generate');
    // don't netplan apply if it might disrupt - route already set
  } else {
    console.log('netplan already has from:');
    console.log(yaml);
  }

  // Restart resolved to clear bad cache
  try { sh('systemctl restart systemd-resolved'); } catch (e) { console.log('resolved restart', e.message); }
  await new Promise(r => setTimeout(r, 2000));

  console.log('=== dns node ===');
  try {
    console.log('api.resend.com', await dns.promises.lookup('api.resend.com'));
  } catch (e) { console.log('dns fail', e.code); }

  // Test Resend API
  const key = (fs.readFileSync('/root/neshastyar/backend/.env','utf8').match(/^RESEND_API_KEY=(.*)$/m)||[])[1];
  await new Promise((resolve) => {
    const body = JSON.stringify({
      from: 'Neshastyar <noreply@neshastyar.com>',
      to: ['alishokri@yahoo.com'],
      subject: 'Verify email - VPS test',
      html: '<p dir="rtl">تست ارسال از سرور نشست یار — Resend از VPS</p>',
    });
    const req = https.request({
      hostname: 'api.resend.com',
      path: '/emails',
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + key,
        'Content-Type': 'application/json',
        'User-Agent': 'neshastyar-backend/1.0',
        'Content-Length': Buffer.byteLength(body),
      },
      timeout: 20000,
    }, (res) => {
      let d=''; res.on('data',c=>d+=c); res.on('end',()=>{ console.log('RESEND STATUS', res.statusCode, d); resolve(); });
    });
    req.on('error', e => { console.log('RESEND FAIL', e.code||e.message); resolve(); });
    req.on('timeout', () => { console.log('RESEND TIMEOUT'); req.destroy(); resolve(); });
    req.write(body); req.end();
  });

  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
