const http = require('http');

const BASE_LAT = 40.4168;
const BASE_LNG = -3.7038;
const RADIUS = 700; // en metros
const COUNT = 20;

const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY3ZjJkM2NjNGQzYjIzODU0Yjg1MGM3MiIsImlhdCI6MTc0NjgwNjM3OSwiZXhwIjoxNzQ2ODM1MTc5fQ.gdV7sfPBPCtwH7LWaOPMiwd6-vpqxSD8GaNhGWfEtzQ';

const generateRandomCoord = (lat, lng, radius) => {
  const r = radius / 111300;
  const u = Math.random();
  const v = Math.random();
  const w = r * Math.sqrt(u);
  const t = 2 * Math.PI * v;
  const deltaLat = w * Math.cos(t);
  const deltaLng = w * Math.sin(t) / Math.cos(lat * Math.PI / 180);
  return {
    latitude: lat + deltaLat,
    longitude: lng + deltaLng
  };
};

const postMeasure = (data, i) => {
  const jsonData = JSON.stringify(data);

  const options = {
    hostname: '167.86.91.53',
    port: 80,
    path: '/api/measure',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(jsonData),
      'Authorization': `Bearer ${TOKEN}`
    }
  };

  const req = http.request(options, (res) => {
    let body = '';
    res.on('data', chunk => (body += chunk));
    res.on('end', () => {
      if (res.statusCode === 201) {
        console.log(`✓ Medida ${i + 1} enviada`);
      } else {
        console.error(`✗ Error ${res.statusCode}:`, body);
      }
    });
  });

  req.on('error', (e) => {
    console.error(`✗ Fallo en medida ${i + 1}:`, e.message);
  });

  req.write(jsonData);
  req.end();
};

for (let i = 0; i < COUNT; i++) {
  const { latitude, longitude } = generateRandomCoord(BASE_LAT, BASE_LNG, RADIUS);

  const measure = {
    timestamp: new Date().toISOString(),
    latitude,
    longitude,
    sensors: {
      1: Math.random() * 100,
      2: Math.random() * 50
    }
  };

  postMeasure(measure, i);
}
