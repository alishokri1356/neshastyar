const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const dns = require('dns');
const https = require('https');

const envPath = path.join(__dirname, '..', '.env');
for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m && !process.env[m[1].trim()]) process.env[m[1].trim()] = m[2].trim();
}

dns.setServers(['1.1.1.1', '8.8.8.8', '9.9.9.9']);

const RESEND_IP = '104.20.29.242';
const apiKey = process.env.RESEND_API_KEY;
const from = `${process.env.RESEND_FROM_NAME || 'نشست یار'} <${process.env.RESEND_FROM || 'noreply@neshastyar.com'}>`;
const to = 'alishokri@yahoo.com';
const token = crypto.randomBytes(32).toString('hex');
const verificationUrl = `https://neshastyar.com/verify-email?token=${token}`;
const html = `<div dir="rtl" style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;direction:rtl;">
  <div style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:white;padding:30px;border-radius:10px 10px 0 0;text-align:center;">
    <h1 style="margin:0;font-size:28px;">نشست یار</h1>
    <p style="margin:10px 0 0 0;opacity:0.9;">سیستم مدیریت جلسات</p>
  </div>
  <div style="background:#f8f9fa;padding:30px;border-radius:0 0 10px 10px;direction:rtl;">
    <h2 style="color:#333;margin-top:0;text-align:right;">سلام علی عزیز!</h2>
    <p style="color:#666;line-height:1.6;font-size:16px;text-align:right;">این یک ایمیل آزمایشی تأیید حساب است. برای تکمیل ثبت نام، روی دکمه زیر کلیک کنید.</p>
    <div style="text-align:center;margin:30px 0;">
      <a href="${verificationUrl}" style="background-color:#667eea;border-radius:25px;color:#ffffff;display:inline-block;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;line-height:50px;text-align:center;text-decoration:none;width:200px;">تأیید ایمیل</a>
    </div>
    <p style="background:#e9ecef;padding:15px;border-radius:5px;word-break:break-all;font-family:monospace;font-size:12px;color:#495057;direction:ltr;">${verificationUrl}</p>
    <p style="color:#999;font-size:12px;text-align:center;">ایمیل آزمایشی از نشست یار</p>
  </div>
</div>`;

const body = JSON.stringify({
  from,
  to: [to],
  subject: 'تأیید ایمیل - نشست یار (تست)',
  html,
});

function post(ip) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      host: ip || 'api.resend.com',
      servername: 'api.resend.com',
      port: 443,
      path: '/emails',
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'neshastyar-backend/1.0',
        'Content-Length': Buffer.byteLength(body),
      },
      timeout: 30000,
      lookup: ip ? (_h, _o, cb) => cb(null, ip, 4) : undefined,
    }, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => resolve({ status: res.statusCode, data }));
    });
    req.on('error', reject);
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.write(body);
    req.end();
  });
}

(async () => {
  console.log('key set', Boolean(apiKey), 'from', from, 'to', to);
  try {
    let result;
    try {
      result = await post(null);
    } catch (e) {
      console.error('DNS/direct failed:', e.message, '- retrying with pinned IP');
      result = await post(RESEND_IP);
    }
    console.log('STATUS', result.status);
    console.log(result.data);
    if (result.status >= 200 && result.status < 300) {
      console.log('SUCCESS token', token);
      process.exit(0);
    }
    process.exit(1);
  } catch (e) {
    console.error('FAIL', e);
    process.exit(1);
  }
})();
