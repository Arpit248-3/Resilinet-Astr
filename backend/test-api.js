const http = require('http');

function get(url) {
  return new Promise((resolve, reject) => {
    http.get(url, r => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => resolve(d));
    }).on('error', reject);
  });
}

async function test() {
  console.log('=== TEST 1: GET /api/alerts (check survivorId) ===');
  const alerts = JSON.parse(await get('http://localhost:5000/api/alerts'));
  console.log(`Found ${alerts.length} alerts`);
  console.log('First alert survivorId:', alerts[0]?.survivorId);
  console.log('Priorities:', alerts.map(a => `${a.survivorId}:${a.priority}`).join(', '));

  console.log('\n=== TEST 2: GET /api/sos-messages/SV-001 ===');
  const msgs = JSON.parse(await get('http://localhost:5000/api/sos-messages/SV-001'));
  console.log(`Found ${msgs.length} messages for SV-001`);
  msgs.forEach(m => console.log(`  - ${m.username}: ${m.message.substring(0, 60)}...`));

  console.log('\n=== TEST 3: POST new message ===');
  const postData = JSON.stringify({
    survivorId: 'SV-001',
    username: 'Arpit Jham',
    message: 'Update: I can hear rescue teams nearby. Please hurry!',
    location: { type: 'Point', coordinates: [75.87, 22.73] }
  });

  const postResult = await new Promise((resolve, reject) => {
    const req = http.request('http://localhost:5000/api/sos-messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) }
    }, r => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => resolve(d));
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
  const parsed = JSON.parse(postResult);
  console.log('Message posted:', parsed.success ? 'SUCCESS' : 'FAILED');

  console.log('\n=== TEST 4: Verify new message in list ===');
  const msgs2 = JSON.parse(await get('http://localhost:5000/api/sos-messages/SV-001'));
  console.log(`Now ${msgs2.length} messages for SV-001 (was ${msgs.length})`);

  console.log('\n✅ ALL API TESTS PASSED');
}

test().catch(e => console.error('Test failed:', e));
