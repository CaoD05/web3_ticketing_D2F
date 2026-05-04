// Test Google Auth endpoint
const http = require('http');

const data = JSON.stringify({ idToken: 'test_invalid_token' });

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/auth/google',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length,
  },
};

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => { body += chunk; });
  res.on('end', () => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Response: ${body}`);
    process.exit(0);
  });
});

req.on('error', (e) => {
  console.error(`Error: ${e.message}`);
  process.exit(1);
});

req.write(data);
req.end();
