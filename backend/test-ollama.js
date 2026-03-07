const http = require('http');

const req = http.request('http://localhost:11434/api/tags', { method: 'GET' }, r => {
  let d = '';
  r.on('data', c => d+=c);
  r.on('end', () => {
    console.log('STATUS:', r.statusCode);
    try {
      const parsed = JSON.parse(d);
      console.log('Models found:', parsed.models.map(m => m.name).join(', '));
    } catch(e) {
      console.log('Error parsing response:', e.message);
      console.log('Raw:', d.substring(0,200));
    }
  });
});
req.on('error', e => console.error('Ollama connection error:', e.message));
req.end();
