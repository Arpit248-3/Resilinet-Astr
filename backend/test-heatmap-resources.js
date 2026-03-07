const http = require('http');

http.get('http://localhost:5000/api/admin/heatmap-data?type=resources', r => {
  let d = '';
  r.on('data', c => d+=c);
  r.on('end', () => {
    try {
      const data = JSON.parse(d);
      console.log(`Received ${data.length} RESOURCE heatmap points.`);
      if (data.length > 0) {
        console.log('Sample resource point:', data[0]);
        const weights = data.map(p => p.weight);
        console.log('Resource Weights distributed:', weights.join(', '));
      } else {
        console.log('No resource data returned.');
      }
    } catch(e) {
      console.error('Failed to parse:', d.substring(0, 200));
    }
  });
}).on('error', console.error);
