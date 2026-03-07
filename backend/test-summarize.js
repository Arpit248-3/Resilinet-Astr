const http = require('http');

const req = http.request('http://localhost:5000/api/summarize/SV-001', { method: 'POST' }, r => {
  let d = '';
  r.on('data', c => d+=c);
  r.on('end', () => console.log('STATUS:', r.statusCode, 'BODY:', d));
});
req.on('error', console.error);
req.end();
