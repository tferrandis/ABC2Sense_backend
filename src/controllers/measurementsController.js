const Measurement = require('../models/measurement');

const R = 6371; // Radio de la Tierra en km

/**
 * @api {post} /api/measurements Create Measurement
 * @apiName CreateMeasurement
 * @apiGroup Measurements
 * @apiVersion 1.0.0
 *
 * @apiDescription Create a new measurement record with multiple sensors
 *
 * @apiHeader {String} Authorization Bearer JWT token
 *
 * @apiBody {String} [user_id] User ID (admin only - ignored for regular users)
 * @apiBody {String} [device_id] Device identifier (optional)
 * @apiBody {String} [timestamp] Measurement timestamp ISO8601 (defaults to server time)
 * @apiBody {Object} [location] Location object with lat and long
 * @apiBody {Number} [location.lat] Latitude coordinate (can be null)
 * @apiBody {Number} [location.long] Longitude coordinate (can be null)
 * @apiBody {Object[]} measurements Array of sensor measurements
 * @apiBody {Number|String} measurements.sensor_id Sensor ID
 * @apiBody {Number} measurements.value Measurement value (must be numeric)
 * @apiBody {String} [notes] Optional notes or comments
 *
 * @apiParamExample {json} Request-Example:
 *     {
 *       "device_id": "ESP32-001",
 *       "timestamp": "2024-01-01T12:00:00.000Z",
 *       "location": {
 *         "lat": 40.7128,
 *         "long": -74.0060
 *       },
 *       "measurements": [
 *         { "sensor_id": 1, "value": 25.5 },
 *         { "sensor_id": 2, "value": 60.3 }
 *       ],
 *       "notes": "Morning reading"
 *     }
 *
 * @apiSuccess (201) {Object} measurement Created measurement object
 *
 * @apiError (400) {String} error Validation error (e.g., non-numeric values)
 * @apiError (401) Unauthorized User not authenticated
 */
exports.createMeasurement = async (req, res) => {
  const { user_id, device_id, timestamp, location, measurements, notes } = req.body;

  try {
    // Validate measurements have numeric values
    if (measurements && Array.isArray(measurements)) {
      for (const m of measurements) {
        if (typeof m.value !== 'number' || isNaN(m.value)) {
          return res.status(400).json({
            error: `Invalid measurement value: ${m.value}. All values must be numeric.`
          });
        }
        if (m.sensor_id === undefined || m.sensor_id === null) {
          return res.status(400).json({
            error: 'Each measurement must have a sensor_id'
          });
        }
      }
    }

    // Determine user_id: admin can specify, regular users use their own
    const effectiveUserId = (req.user.role === 'admin' && user_id)
      ? user_id
      : req.user._id;

    const measurement = new Measurement({
      user_id: effectiveUserId,
      device_id: device_id || null,
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      location: location || { lat: null, long: null },
      measurements: measurements || [],
      notes: notes || null,
    });

    await measurement.save();
    res.status(201).json(measurement);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

/**
 * @api {get} /api/measurements Get Measurements
 * @apiName GetMeasurements
 * @apiGroup Measurements
 * @apiVersion 1.0.0
 *
 * @apiDescription Get paginated measurements with optional filtering by time range and location
 *
 * @apiHeader {String} Authorization Bearer JWT token
 *
 * @apiQuery {String} [from] Start timestamp for filtering (ISO 8601 format)
 * @apiQuery {String} [to] End timestamp for filtering (ISO 8601 format)
 * @apiQuery {Number} [lat] Latitude for radius filtering
 * @apiQuery {Number} [lng] Longitude for radius filtering
 * @apiQuery {Number} [radius] Radius in km for location filtering
 * @apiQuery {Number} [page=1] Page number
 * @apiQuery {Number} [limit=20] Items per page
 *
 * @apiSuccess {Number} total Total number of measurements
 * @apiSuccess {Number} page Current page
 * @apiSuccess {Number} limit Items per page
 * @apiSuccess {Object[]} measurements Array of measurement objects
 *
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "total": 100,
 *       "page": 1,
 *       "limit": 20,
 *       "measurements": [
 *         {
 *           "_id": "507f1f77bcf86cd799439011",
 *           "user_id": "507f1f77bcf86cd799439012",
 *           "timestamp": "2024-01-01T12:00:00.000Z",
 *           "location": {
 *             "lat": 40.7128,
 *             "long": -74.0060
 *           },
 *           "measurements": [
 *             { "sensor_id": 1, "value": 25.5 },
 *             { "sensor_id": 2, "value": 60.3 }
 *           ]
 *         }
 *       ]
 *     }
 *
 * @apiError (500) {String} error Error message
 * @apiError (401) Unauthorized User not authenticated
 */
exports.getMeasurements = async (req, res) => {
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
    user_id: req.user._id
  };

  // Filtro por rango de fechas
  if (from || to) {
    filter.timestamp = {};
    if (from) filter.timestamp.$gte = new Date(from);
    if (to) filter.timestamp.$lte = new Date(to);
  }

  // Filtro geoespacial usando fórmula de Haversine
  let haversineQuery = {};
  if (lat && lng && radius) {
    const latRad = parseFloat(lat) * Math.PI / 180;
    const lngRad = parseFloat(lng) * Math.PI / 180;

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
                        { $sin: { $multiply: [{ $divide: [Math.PI, 180] }, "$location.lat"] } },
                        Math.sin(latRad)
                      ]
                    },
                    {
                      $multiply: [
                        { $cos: { $multiply: [{ $divide: [Math.PI, 180] }, "$location.lat"] } },
                        Math.cos(latRad),
                        {
                          $cos: {
                            $subtract: [
                              { $multiply: [{ $divide: [Math.PI, 180] }, "$location.long"] },
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

    // Contar total de documentos
    const total = await Measurement.countDocuments(query);

    // Obtener mediciones paginadas
    const measurements = await Measurement.find(query)
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.status(200).json({
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / limit),
      measurements
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * @api {get} /api/measurements/:id Get Measurement by ID
 * @apiName GetMeasurementById
 * @apiGroup Measurements
 * @apiVersion 1.0.0
 *
 * @apiDescription Get a specific measurement by ID
 *
 * @apiHeader {String} Authorization Bearer JWT token
 *
 * @apiParam {String} id Measurement ID
 *
 * @apiSuccess {Object} measurement Measurement object
 * @apiSuccess {String} measurement._id Measurement ID
 * @apiSuccess {String} measurement.user_id User ID
 * @apiSuccess {String} measurement.timestamp Measurement timestamp
 * @apiSuccess {Object} measurement.location Location object
 * @apiSuccess {Number} measurement.location.lat Latitude
 * @apiSuccess {Number} measurement.location.long Longitude
 * @apiSuccess {Object[]} measurement.measurements Array of sensor measurements
 * @apiSuccess {Mixed} measurement.measurements.sensor_id Sensor ID
 * @apiSuccess {Mixed} measurement.measurements.value Measurement value
 *
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "_id": "507f1f77bcf86cd799439011",
 *       "user_id": "507f1f77bcf86cd799439012",
 *       "timestamp": "2024-01-01T12:00:00.000Z",
 *       "location": {
 *         "lat": 40.7128,
 *         "long": -74.0060
 *       },
 *       "measurements": [
 *         { "sensor_id": 1, "value": 25.5 },
 *         { "sensor_id": 2, "value": 60.3 }
 *       ]
 *     }
 *
 * @apiError (404) {String} message Measurement not found
 * @apiError (403) {String} message Not authorized to access this measurement
 * @apiError (500) {String} error Error message
 * @apiError (401) Unauthorized User not authenticated
 */
exports.getMeasurementById = async (req, res) => {
  try {
    const measurement = await Measurement.findById(req.params.id);

    if (!measurement) {
      return res.status(404).json({ message: 'Medición no encontrada' });
    }

    // Verificar que el usuario sea el dueño de la medición
    if (measurement.user_id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'No autorizado para acceder a esta medición' });
    }

    res.status(200).json(measurement);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * @api {delete} /api/measurements/:id Delete Measurement
 * @apiName DeleteMeasurement
 * @apiGroup Measurements
 * @apiVersion 1.0.0
 *
 * @apiDescription Delete a specific measurement by ID
 *
 * @apiHeader {String} Authorization Bearer JWT token
 *
 * @apiParam {String} id Measurement ID
 *
 * @apiSuccess {String} message Success message
 *
 * @apiError (404) {String} message Measurement not found
 * @apiError (403) {String} message Not authorized to delete this measurement
 * @apiError (500) {String} error Error message
 * @apiError (401) Unauthorized User not authenticated
 */
exports.deleteMeasurement = async (req, res) => {
  try {
    const measurement = await Measurement.findById(req.params.id);

    if (!measurement) {
      return res.status(404).json({ message: 'Medición no encontrada' });
    }

    // Verificar que el usuario sea el dueño de la medición
    if (measurement.user_id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'No autorizado para eliminar esta medición' });
    }

    await Measurement.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Medición eliminada correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * @api {post} /api/measurements/batch Create Batch Measurements
 * @apiName CreateBatchMeasurements
 * @apiGroup Measurements
 * @apiVersion 1.0.0
 *
 * @apiDescription Create multiple measurements in a single request (for offline sync)
 *
 * @apiHeader {String} Authorization Bearer JWT token
 *
 * @apiBody {Object[]} measurements Array of measurement objects (max 20)
 * @apiBody {String} [measurements.user_id] User ID (admin only)
 * @apiBody {String} [measurements.device_id] Device identifier
 * @apiBody {String} [measurements.timestamp] ISO8601 timestamp
 * @apiBody {Object} [measurements.location] Location {lat, long}
 * @apiBody {Object[]} measurements.measurements Sensor readings array
 * @apiBody {String} [measurements.notes] Optional notes
 *
 * @apiParamExample {json} Request-Example:
 *     {
 *       "measurements": [
 *         {
 *           "device_id": "ESP32-001",
 *           "timestamp": "2024-01-01T12:00:00.000Z",
 *           "location": { "lat": 40.71, "long": -74.00 },
 *           "measurements": [{ "sensor_id": 1, "value": 25.5 }]
 *         },
 *         {
 *           "device_id": "ESP32-001",
 *           "timestamp": "2024-01-01T12:05:00.000Z",
 *           "measurements": [{ "sensor_id": 1, "value": 26.0 }]
 *         }
 *       ]
 *     }
 *
 * @apiSuccess (201) {Object[]} results Array of results per measurement
 * @apiSuccess (201) {Number} results.index Index in original array
 * @apiSuccess (201) {Boolean} results.success Whether insert succeeded
 * @apiSuccess (201) {String} [results.id] Created measurement ID (if success)
 * @apiSuccess (201) {String} [results.error] Error message (if failed)
 *
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 201 Created
 *     {
 *       "results": [
 *         { "index": 0, "success": true, "id": "507f1f77bcf86cd799439011" },
 *         { "index": 1, "success": true, "id": "507f1f77bcf86cd799439012" }
 *       ],
 *       "summary": { "total": 2, "success": 2, "failed": 0 }
 *     }
 *
 * @apiError (400) {String} error Batch limit exceeded or invalid format
 * @apiError (401) Unauthorized User not authenticated
 */
exports.createBatchMeasurements = async (req, res) => {
  const { measurements } = req.body;
  const BATCH_LIMIT = 20;

  // Validate input
  if (!measurements || !Array.isArray(measurements)) {
    return res.status(400).json({ error: 'measurements must be an array' });
  }

  if (measurements.length > BATCH_LIMIT) {
    return res.status(400).json({
      error: `Batch limit exceeded. Maximum ${BATCH_LIMIT} measurements per request.`
    });
  }

  if (measurements.length === 0) {
    return res.status(400).json({ error: 'measurements array cannot be empty' });
  }

  const results = [];
  let successCount = 0;
  let failedCount = 0;

  for (let i = 0; i < measurements.length; i++) {
    const item = measurements[i];

    try {
      // Validate measurement values
      if (item.measurements && Array.isArray(item.measurements)) {
        for (const m of item.measurements) {
          if (typeof m.value !== 'number' || isNaN(m.value)) {
            throw new Error(`Invalid measurement value: ${m.value}. Must be numeric.`);
          }
          if (m.sensor_id === undefined || m.sensor_id === null) {
            throw new Error('Each measurement must have a sensor_id');
          }
        }
      }

      // Determine user_id
      const effectiveUserId = (req.user.role === 'admin' && item.user_id)
        ? item.user_id
        : req.user._id;

      const measurement = new Measurement({
        user_id: effectiveUserId,
        device_id: item.device_id || null,
        timestamp: item.timestamp ? new Date(item.timestamp) : new Date(),
        location: item.location || { lat: null, long: null },
        measurements: item.measurements || [],
        notes: item.notes || null,
      });

      await measurement.save();

      results.push({
        index: i,
        success: true,
        id: measurement._id.toString()
      });
      successCount++;

    } catch (error) {
      results.push({
        index: i,
        success: false,
        error: error.message
      });
      failedCount++;
    }
  }

  res.status(201).json({
    results,
    summary: {
      total: measurements.length,
      success: successCount,
      failed: failedCount
    }
  });
};
