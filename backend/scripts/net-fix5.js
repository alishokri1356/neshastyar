const { execSync } = require('child_process');
const net = require('net');
function sh(cmd) {
  try { return execSync(cmd, { encoding: 'utf8', timeout: 15000 }).trim(); }
  catch (e) { return ((e.stdout||'') + (e.stderr||e.message)).trim().slice(0,2500); }
}
function tcp(host, port, ms=5000) {
  return new Promise((r) => {
    const s = net.connect({ host, port, timeout: ms }, () => { s.destroy(); r('OK'); });
    s.on('error', e => r('FAIL:'+e.code));
    s.on('timeout', () => { s.destroy(); r('TIMEOUT'); });
  });
}
(async () => {
  console.log('=== arp ===');
  console.log(sh('ip neigh show; arp -n 2>/dev/null | head -20'));
  console.log('=== ufw-user-output ===');
  console.log(sh('iptables -L ufw-user-output -n -v --line-numbers 2>&1'));
  console.log('=== ufw-before-output full ===');
  console.log(sh('iptables -L ufw-before-output -n -v --line-numbers 2>&1'));
  console.log('=== eth0 stats ===');
  console.log(sh('ip -s link show eth0'));
  console.log('=== try secondary src ===');
  console.log(sh('ping -c 1 -W 2 -I 195.248.240.30 8.8.8.8 2>&1'));
  console.log(sh('ping -c 1 -W 2 -I 156.253.5.234 8.8.8.8 2>&1'));
  // Can we reach other hosts on same /24?
  console.log('=== same subnet scan few ===');
  for (const ip of ['156.253.5.1','156.253.5.2','156.253.5.253','156.253.5.254','195.248.240.1','195.248.240.254']) {
    console.log(ip, await tcp(ip, 80, 2000), await tcp(ip, 443, 2000));
  }
  // curl localhost via public IP?
  console.log('local 443', await tcp('127.0.0.1', 443));
  console.log('public self 443', await tcp('156.253.5.234', 443));
  console.log('curl self', sh('curl -sS --connect-timeout 3 -o /dev/null -w "%{http_code}" http://127.0.0.1:3001/health'));
  // Check recent successful outbound from conntrack
  console.log('=== conntrack sample ===');
  console.log(sh('conntrack -L 2>/dev/null | head -30 || ss -tn state established | head -30'));
  process.exit(0);
})();
