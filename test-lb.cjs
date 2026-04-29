const https = require('https');

const req = https.request('https://openapi.longbridgeapp.com/v1/asset/stock', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJub25lIn0.eyJ1c2VyIjoiYWJjIn0.',
    'Content-Type': 'application/json'
  }
}, (res) => {
  let chunks = '';
  res.on('data', chunk => chunks += chunk);
  res.on('end', () => console.log('Response:', chunks));
});
req.end();
