const http = require('http');

http.get('http://localhost:5000/api/alerts', r => {
  let d = '';
  r.on('data', c => d+=c);
  r.on('end', () => {
    const alerts = JSON.parse(d);
    const sv1 = alerts.find(a => a.survivorId === 'SV-001');
    if (sv1 && sv1.aiSummary) {
      console.log('READY:\n' + sv1.aiSummary);
    } else {
      console.log('STILL_PROCESSING');
    }
  });
}).on('error', console.error);
