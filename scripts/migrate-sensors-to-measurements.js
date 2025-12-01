#!/usr/bin/env node

/**
 * Script de migración de datos del modelo Sensor al modelo Measurement
 *
 * Este script:
 * 1. Lee todos los documentos del modelo Sensor
 * 2. Los agrupa por user, timestamp y coordenadas
 * 3. Crea documentos en el modelo Measurement
 * 4. Opcionalmente elimina los documentos antiguos de Sensor
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Cargar variables de entorno
dotenv.config({ path: path.join(__dirname, '../.env') });

// Modelos
const Sensor = require('../src/models/sensor');
const Measurement = require('../src/models/measurement');

const COLORS = {
  RESET: '\x1b[0m',
  BRIGHT: '\x1b[1m',
  RED: '\x1b[31m',
  GREEN: '\x1b[32m',
  YELLOW: '\x1b[33m',
  BLUE: '\x1b[34m',
  CYAN: '\x1b[36m',
};

function log(color, message) {
  console.log(`${color}${message}${COLORS.RESET}`);
}

async function migrateSensorsToMeasurements() {
  try {
    log(COLORS.BLUE, '\n========================================');
    log(COLORS.BLUE, '  Migración: Sensor → Measurement');
    log(COLORS.BLUE, '========================================\n');

    // Conectar a MongoDB
    log(COLORS.CYAN, '[1/6] Conectando a MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    log(COLORS.GREEN, '      ✓ Conectado a MongoDB\n');

    // Contar sensores existentes
    log(COLORS.CYAN, '[2/6] Contando documentos existentes...');
    const sensorCount = await Sensor.countDocuments();
    const measurementCount = await Measurement.countDocuments();
    log(COLORS.YELLOW, `      → Sensores existentes: ${sensorCount}`);
    log(COLORS.YELLOW, `      → Mediciones existentes: ${measurementCount}\n`);

    if (sensorCount === 0) {
      log(COLORS.YELLOW, '      ⚠ No hay sensores para migrar');
      await mongoose.disconnect();
      return;
    }

    // Obtener todos los sensores
    log(COLORS.CYAN, '[3/6] Obteniendo todos los sensores...');
    const sensors = await Sensor.find({}).sort({ timestamp: 1 });
    log(COLORS.GREEN, `      ✓ ${sensors.length} sensores recuperados\n`);

    // Agrupar sensores por user, timestamp y coordenadas
    log(COLORS.CYAN, '[4/6] Agrupando sensores por timestamp y ubicación...');
    const grouped = {};

    for (const sensor of sensors) {
      // Redondear timestamp a segundos para agrupar
      const timestamp = new Date(sensor.timestamp);
      timestamp.setMilliseconds(0);

      const key = `${sensor.user}_${timestamp.toISOString()}_${sensor.coordinates.latitude}_${sensor.coordinates.longitude}`;

      if (!grouped[key]) {
        grouped[key] = {
          user_id: sensor.user,
          timestamp: timestamp,
          location: {
            lat: sensor.coordinates.latitude,
            long: sensor.coordinates.longitude,
          },
          measurements: [],
          originalIds: []
        };
      }

      grouped[key].measurements.push({
        sensor_id: parseInt(sensor.sensorId) || sensor.sensorId,
        value: sensor.value
      });

      grouped[key].originalIds.push(sensor._id);
    }

    const groupedCount = Object.keys(grouped).length;
    log(COLORS.GREEN, `      ✓ ${groupedCount} grupos creados\n`);

    // Crear documentos de Measurement
    log(COLORS.CYAN, '[5/6] Creando documentos de Measurement...');
    let created = 0;
    let errors = 0;

    for (const key in grouped) {
      const data = grouped[key];
      try {
        const measurement = new Measurement({
          user_id: data.user_id,
          timestamp: data.timestamp,
          location: data.location,
          measurements: data.measurements
        });

        await measurement.save();
        created++;

        // Mostrar progreso cada 10 documentos
        if (created % 10 === 0) {
          process.stdout.write(`\r      → Creados: ${created}/${groupedCount}`);
        }
      } catch (error) {
        errors++;
        log(COLORS.RED, `      ✗ Error creando medición: ${error.message}`);
      }
    }

    console.log(''); // Nueva línea
    log(COLORS.GREEN, `      ✓ ${created} mediciones creadas`);
    if (errors > 0) {
      log(COLORS.RED, `      ✗ ${errors} errores\n`);
    } else {
      log(COLORS.GREEN, '      ✓ Sin errores\n');
    }

    // Preguntar si eliminar sensores antiguos
    log(COLORS.CYAN, '[6/6] Limpieza de datos antiguos...');
    log(COLORS.YELLOW, '      ⚠ Los datos antiguos del modelo Sensor se mantendrán por seguridad');
    log(COLORS.YELLOW, '      → Para eliminarlos manualmente, ejecuta:');
    log(COLORS.YELLOW, '        db.sensors.drop()');
    log(COLORS.YELLOW, '      → O desde código: await Sensor.deleteMany({});\n');

    // Resumen final
    log(COLORS.BLUE, '========================================');
    log(COLORS.GREEN, '  ✓ MIGRACIÓN COMPLETADA');
    log(COLORS.BLUE, '========================================\n');

    log(COLORS.BRIGHT, 'Resumen:');
    log(COLORS.YELLOW, `  • Sensores procesados: ${sensorCount}`);
    log(COLORS.YELLOW, `  • Mediciones creadas: ${created}`);
    log(COLORS.YELLOW, `  • Agrupaciones: ${groupedCount}`);
    log(COLORS.YELLOW, `  • Ratio de compresión: ${(sensorCount / created).toFixed(2)}:1`);
    console.log('');

    // Desconectar
    await mongoose.disconnect();
    log(COLORS.GREEN, '✓ Desconectado de MongoDB\n');

  } catch (error) {
    log(COLORS.RED, `\n✗ Error durante la migración: ${error.message}`);
    log(COLORS.RED, error.stack);
    process.exit(1);
  }
}

// Ejecutar migración
migrateSensorsToMeasurements();
