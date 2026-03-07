const http = require('http');

http.get('http://localhost:5000/api/admin/heatmap-data?type=sos', r => {
  let d = '';
  r.on('data', c => d+=c);
  r.on('end', () => {
    try {
      const data = JSON.parse(d);
      console.log(`Received ${data.length} heatmap points.`);
      if (data.length > 0) {
        console.log('Sample point:', data[0]);
        const weights = data.map(p => p.weight);
        console.log('Weights distributed:', weights.join(', '));
      } else {
        console.log('No data returned.');
      }
    } catch(e) {
      console.error('Failed to parse:', d.substring(0, 200));
    }
  });
}).on('error', console.error);
