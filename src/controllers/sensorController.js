// controllers/sensorController.js
const Sensor = require('../models/sensor');
const SensorDefinition = require('../models/sensorDefinition');

/**
 * @api {post} /api/sensor/sensors Create Sensor
 * @apiName CreateSensor
 * @apiGroup Sensors
 * @apiVersion 1.0.0
 *
 * @apiDescription Create a new sensor measurement
 *
 * @apiHeader {String} Authorization Bearer JWT token
 *
 * @apiBody {Number} sensorId Sensor ID
 * @apiBody {Number} value Measurement value
 * @apiBody {Number} latitude GPS latitude coordinate
 * @apiBody {Number} longitude GPS longitude coordinate
 *
 * @apiSuccess (201) {Object} sensor Created sensor object
 *
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 201 Created
 *     {
 *       "_id": "507f1f77bcf86cd799439011",
 *       "user": "507f1f77bcf86cd799439012",
 *       "sensorId": 1,
 *       "value": 25.5,
 *       "coordinates": {
 *         "latitude": 40.7128,
 *         "longitude": -74.0060
 *       }
 *     }
 *
 * @apiError (400) {String} error Error message
 * @apiError (401) Unauthorized User not authenticated
 */
exports.createSensor = async (req, res) => {
    const { sensorId, value, latitude, longitude } = req.body;
    try {
        const sensor = new Sensor({
            user: req.user._id,
            sensorId,
            value,
            coordinates: { latitude, longitude },
        });
        await sensor.save();
        res.status(201).json(sensor);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

/**
 * @api {post} /api/sensor/measure Add Multiple Measurements
 * @apiName AddMeasure
 * @apiGroup Sensors
 * @apiVersion 1.0.0
 *
 * @apiDescription Add measurements for multiple sensors at once
 *
 * @apiHeader {String} Authorization Bearer JWT token
 *
 * @apiBody {String} [timestamp] Measurement timestamp (defaults to current time)
 * @apiBody {Number} [latitude] GPS latitude coordinate
 * @apiBody {Number} [longitude] GPS longitude coordinate
 * @apiBody {Object} measurements Object with sensorId as keys and values
 *
 * @apiParamExample {json} Request-Example:
 *     {
 *       "timestamp": "2024-01-01T12:00:00.000Z",
 *       "latitude": 40.7128,
 *       "longitude": -74.0060,
 *       "measurements": {
 *         "1": 25.5,
 *         "2": 60.3,
 *         "3": 1013.2
 *       }
 *     }
 *
 * @apiSuccess (201) {Object[]} sensors Array of saved sensor measurements
 *
 * @apiError (500) {String} error Error message
 * @apiError (401) Unauthorized User not authenticated
 */
// Guardar medida para varios sensores
exports.addMeasure = async (req, res) => {
  const { timestamp = new Date(), latitude = null, longitude = null, measurements } = req.body;


  try {
    const userId = req.user._id;

    const rawEntries = Object.entries(measurements);
    const entries = rawEntries.map(([k, v]) => [parseInt(k), v]);


    const savedSensors = [];

    for (let [sensorId, value] of entries) {
      const sensor = new Sensor({
        user: userId,
        timestamp: new Date(timestamp),
        sensorId,
        value,
        coordinates: (latitude != null && longitude != null)
          ? { latitude, longitude }
          : undefined
      });

      await sensor.save();
      savedSensors.push(sensor);
    }

    res.status(201).json(savedSensors);

  } catch (error) {
    console.error("Error saving measurements:", error);
    res.status(500).json({ error: "Error saving measurements." });
  }
};


  const R = 6371; // Radio de la Tierra en km

/**
 * @api {get} /api/sensor/measure Get Measurements
 * @apiName GetMeasures
 * @apiGroup Sensors
 * @apiVersion 1.0.0
 *
 * @apiDescription Get paginated measurements with optional filtering by time range and location
 *
 * @apiHeader {String} Authorization Bearer JWT token
 *
 * @apiQuery {String} [from] Start timestamp for filtering
 * @apiQuery {String} [to] End timestamp for filtering
 * @apiQuery {Number} [lat] Latitude for radius filtering
 * @apiQuery {Number} [lng] Longitude for radius filtering
 * @apiQuery {Number} [radius] Radius in km for location filtering
 * @apiQuery {Number} [page=1] Page number
 * @apiQuery {Number} [limit=20] Items per page
 *
 * @apiSuccess {Number} total Total number of measurements
 * @apiSuccess {Number} page Current page
 * @apiSuccess {Number} limit Items per page
 * @apiSuccess {Object[]} measures Array of grouped measurements
 *
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "total": 100,
 *       "page": 1,
 *       "limit": 20,
 *       "measures": [
 *         {
 *           "coordinates": {
 *             "latitude": 40.7128,
 *             "longitude": -74.0060
 *           },
 *           "timestamp": "2024-01-01T12:00:00.000Z",
 *           "measurements": {
 *             "1": 25.5,
 *             "2": 60.3
 *           }
 *         }
 *       ]
 *     }
 *
 * @apiError (500) {String} error Error message
 * @apiError (401) Unauthorized User not authenticated
 */
exports.getMeasures = async (req, res) => {
  const {
    from,
    to,
    lat,
    lng,
    radius,
    page = 1,
    limit = 20
  } = req.query;

  const filter = {
    user: req.user._id
  };

  if (from || to) {
    filter.timestamp = {};
    if (from) filter.timestamp.$gte = new Date(from);
    if (to) filter.timestamp.$lte = new Date(to);
  }

  let haversineQuery = {};

  if (lat && lng && radius) {
    const latRad = parseFloat(lat) * Math.PI / 180;
    const lngRad = parseFloat(lng) * Math.PI / 180;
    console.log("a")
    haversineQuery = {
      $expr: {
        $lte: [
          {
            $multiply: [
              R,
              {
                $acos: {
                  $add: [
                    {
                      $multiply: [
                        { $sin: { $degreesToRadians: "$coordinates.latitude" } },
                        Math.sin(latRad)
                      ]
                    },
                    {
                      $multiply: [
                        { $cos: { $degreesToRadians: "$coordinates.latitude" } },
                        Math.cos(latRad),
                        {
                          $cos: {
                            $subtract: [
                              { $degreesToRadians: "$coordinates.longitude" },
                              lngRad
                            ]
                          }
                        }
                      ]
                    }
                  ]
                }
              }
            ]
          },
          parseFloat(radius)
        ]
      }
    };
  }

  try {
    const query = Object.keys(haversineQuery).length > 0
      ? { $and: [filter, haversineQuery] }
      : filter;

    const allSensors = await Sensor.find(query).sort({ timestamp: -1 });

    // Agrupar por timestamp y coordenadas
    const grouped = {};
    for (const sensor of allSensors) {
      const key = `${sensor.timestamp.toISOString()}_${sensor.coordinates.latitude}_${sensor.coordinates.longitude}`;
      if (!grouped[key]) {
        grouped[key] = {
          coordinates: {
            latitude: sensor.coordinates.latitude,
            longitude: sensor.coordinates.longitude,
          },
          timestamp: sensor.timestamp,
          measurements: {},
        };
      }
      grouped[key].measurements[sensor.sensorId] = sensor.value;
    }

    const allGroups = Object.values(grouped);

    const total = allGroups.length;

    // Aplicar paginación sobre los grupos
    const paginated = allGroups.slice((page - 1) * limit, page * limit);

    res.status(200).json({
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      measures: paginated
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * @api {post} /api/sensor/sensor Create Sensor Definition
 * @apiName CreateSensorDefinition
 * @apiGroup Sensor Definitions
 * @apiVersion 1.0.0
 *
 * @apiDescription Create a new sensor type definition
 *
 * @apiHeader {String} Authorization Bearer JWT token
 *
 * @apiBody {Number} sensorId Unique sensor ID
 * @apiBody {String} title Sensor title
 * @apiBody {String} measure What the sensor measures
 * @apiBody {String} unit Unit of measurement
 * @apiBody {String} description Sensor description
 *
 * @apiSuccess (201) {Object} definition Created sensor definition
 *
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 201 Created
 *     {
 *       "_id": "507f1f77bcf86cd799439011",
 *       "sensorId": 1,
 *       "title": "Temperature Sensor",
 *       "measure": "Temperature",
 *       "unit": "°C",
 *       "description": "Measures ambient temperature"
 *     }
 *
 * @apiError (400) {String} message Sensor ID already exists
 * @apiError (401) Unauthorized User not authenticated
 */
// Crear definición de sensor
exports.createSensorDefinition = async (req, res) => {
  const { sensorId, title, measure, unit, description } = req.body;
  try {
    const existing = await SensorDefinition.findOne({ sensorId });
    if (existing) return res.status(400).json({ message: "Sensor ID already exists" });

    const def = new SensorDefinition({ sensorId, title, description, unit, measure });
    await def.save();
    res.status(201).json(def);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

/**
 * @api {get} /api/sensor/sensors/:userId Get Sensors by User
 * @apiName GetSensorsByUser
 * @apiGroup Sensors
 * @apiVersion 1.0.0
 *
 * @apiDescription Get all sensors for a specific user
 *
 * @apiHeader {String} Authorization Bearer JWT token
 *
 * @apiParam {String} userId User's ID
 *
 * @apiSuccess {Object[]} sensors Array of sensor measurements
 *
 * @apiError (500) {String} error Error message
 * @apiError (401) Unauthorized User not authenticated
 */
exports.getSensorsByUser = async (req, res) => {
  const { userId } = req.params;
  try {
    const sensors = await Sensor.find({ user: userId });
    res.status(200).json(sensors);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * @api {get} /api/sensor/sensor Get All Sensor Definitions
 * @apiName GetSensorDefinitions
 * @apiGroup Sensor Definitions
 * @apiVersion 1.0.0
 *
 * @apiDescription Get all sensor type definitions
 *
 * @apiHeader {String} Authorization Bearer JWT token
 *
 * @apiSuccess {Object[]} sensors Array of sensor definitions
 *
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 200 OK
 *     [
 *       {
 *         "_id": "507f1f77bcf86cd799439011",
 *         "sensorId": 1,
 *         "title": "Temperature Sensor",
 *         "measure": "Temperature",
 *         "unit": "°C",
 *         "description": "Measures ambient temperature"
 *       }
 *     ]
 *
 * @apiError (500) {String} error Error message
 * @apiError (401) Unauthorized User not authenticated
 */
exports.getSensorDefinitions = async (req, res) => {
  try {
    const sensors = await SensorDefinition.find({});
    res.status(200).json(sensors);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
