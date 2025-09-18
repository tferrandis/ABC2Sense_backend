const http = require('http');

const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY3ZjJkM2NjNGQzYjIzODU0Yjg1MGM3MiIsImlhdCI6MTc0NjgwNjM3OSwiZXhwIjoxNzQ2ODM1MTc5fQ.gdV7sfPBPCtwH7LWaOPMiwd6-vpqxSD8GaNhGWfEtzQ';

const definitions = [
  {
    sensorId: 1,
    title: 'Temperatura',
    measure: 1,
    unit: '°C',
    description: 'Sensor de temperatura ambiente'
  },
  {
    sensorId: 2,
    title: 'Humedad',
    measure: 2,
    unit: '%',
    description: 'Sensor de humedad relativa'
  }
];


const postSensor = (data, i) => {
  const jsonData = JSON.stringify(data);

  const options = {
    hostname: '167.86.91.53',
    port: 80,
    path: '/api/sensor',
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
        console.log(`✓ Sensor ${data.sensorId} creado`);
      } else {
        console.error(`✗ Error creando sensor ${data.sensorId}:`, body);
      }
    });
  });

  req.on('error', (e) => {
    console.error(`✗ Error red ${data.sensorId}:`, e.message);
  });

  req.write(jsonData);
  req.end();
};

definitions.forEach(postSensor);
