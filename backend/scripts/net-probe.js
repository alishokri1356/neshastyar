const net = require('net');
const dns = require('dns');
const targets = ['api.resend.com','mail.neshastyar.com','1.1.1.1','8.8.8.8','n8nnew.teraxr.com'];
(async () => {
  for (const h of targets) {
    try {
      const a = await dns.promises.lookup(h);
      console.log('dns', h, a.address);
    } catch (e) {
      console.log('dns', h, 'FAIL', e.code);
    }
  }
  for (const [h,p] of [['104.20.29.242',443],['1.1.1.1',443],['8.8.8.8',53]]) {
    await new Promise((r) => {
      const s = net.connect({host:h,port:p,timeout:5000},()=>{console.log('tcp',h+':'+p,'OK');s.destroy();r();});
      s.on('error',e=>{console.log('tcp',h+':'+p,'FAIL',e.code);r();});
      s.on('timeout',()=>{console.log('tcp',h+':'+p,'TIMEOUT');s.destroy();r();});
    });
  }
  process.exit(0);
})();
