const fetch = require('node-fetch');

async function testWebhook() {
  const meetingId = '0b6d7796-1f0c-450a-abe2-11adaeeb6b86';
  const url = `http://localhost:3001/sendmail/${meetingId}`;
  
  console.log('🧪 Testing webhook:', url);
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    console.log('📊 Response Status:', response.status);
    console.log('📊 Response Data:', JSON.stringify(data, null, 2));
    
    if (response.ok) {
      console.log('✅ Webhook test successful!');
    } else {
      console.log('❌ Webhook test failed!');
    }
    
  } catch (error) {
    console.error('💥 Error testing webhook:', error.message);
  }
}

testWebhook();
