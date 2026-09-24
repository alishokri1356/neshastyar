const { execSync } = require('child_process');
const net = require('net');
function sh(cmd) {
  try { return execSync(cmd, { encoding: 'utf8', timeout: 20000 }).trim(); }
  catch (e) { return ((e.stdout||'') + (e.stderr||e.message)).trim().slice(0,3000); }
}
function tcp(host, port, ms=4000) {
  return new Promise((r) => {
    const s = net.connect({ host, port, timeout: ms }, () => { s.destroy(); r('OK'); });
    s.on('error', e => r('FAIL:'+e.code));
    s.on('timeout', () => { s.destroy(); r('TIMEOUT'); });
  });
}
(async () => {
  console.log('=== iptables OUTPUT ===');
  console.log(sh('iptables -L OUTPUT -n -v --line-numbers 2>&1 | head -40'));
  console.log('=== iptables FILTER ===');
  console.log(sh('iptables -L -n -v 2>&1 | head -80'));
  console.log('=== nft ===');
  console.log(sh('nft list ruleset 2>&1 | head -80'));
  console.log('=== ping gw ===');
  console.log(sh('ping -c 2 -W 2 156.253.5.254 2>&1'));
  console.log('=== ping 8.8.8.8 ===');
  console.log(sh('ping -c 2 -W 2 8.8.8.8 2>&1'));
  console.log('=== traceroute ===');
  console.log(sh('traceroute -n -w 2 -m 5 8.8.8.8 2>&1 || tracepath -n 8.8.8.8 2>&1 | head -15'));
  console.log('=== curl via docker n8n ===');
  console.log(sh('docker exec n8n wget -qO- --timeout=8 https://api.resend.com 2>&1 | head -5'));
  console.log(sh('docker exec n8n wget -qO- --timeout=8 https://1.1.1.1 2>&1 | head -5'));
  console.log(sh('docker exec n8n nslookup api.resend.com 2>&1 | head -15'));
  console.log('=== local n8n ===');
  console.log('local 5678', await tcp('127.0.0.1', 5678));
  console.log('=== mysql ===');
  console.log('local 3306', await tcp('127.0.0.1', 3306));
  console.log('=== ufw ===');
  console.log(sh('ufw status verbose 2>&1 | head -30'));
  console.log('=== ip rule/route table ===');
  console.log(sh('ip rule list; ip route show table all | head -40'));
  process.exit(0);
})();
