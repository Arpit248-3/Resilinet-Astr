const http = require('http');

async function checkStatus() {
  const alerts = await new Promise(res => {
    http.get('http://localhost:5000/api/alerts', r => {
      let d=''; r.on('data', c=>d+=c); r.on('end', ()=>res(JSON.parse(d)));
    });
  });
  const sv1 = alerts.find(a => a.survivorId === 'SV-001');
  console.log(`SV-001 Summary Status:`, sv1 ? sv1.aiSummary ? 'HAS_SUMMARY' : 'NULL' : 'NOT_FOUND');
}

async function runTest() {
  console.log('1. Initial check (should be NULL since we just reseeded):');
  await checkStatus();
  
  console.log('\n2. Posting new message to trigger auto-summarize...');
  const postData = JSON.stringify({
    survivorId: 'SV-001',
    username: 'Test User',
    message: 'Help, I am trapped!',
    location: { type: 'Point', coordinates: [75.87, 22.73] }
  });

  const postResult = await new Promise(resolve => {
    const req = http.request('http://localhost:5000/api/sos-messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) }
    }, r => {
      let d = ''; r.on('data', c => d+=c); r.on('end', () => resolve(d));
    });
    req.write(postData);
    req.end();
  });
  console.log('Post result:', postResult);
  
  console.log('\n3. Waiting 10 seconds to let the model generate the first phrase (will stream/store in background)...');
  // It won't finish in 10s but the request is sent to the background.
}

runTest();
