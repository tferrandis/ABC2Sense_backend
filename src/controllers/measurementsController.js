const Measurement = require('../models/measurement');
const User = require('../models/user');

const R = 6371; // Radio de la Tierra en km

/**
 * Builds a MongoDB filter from request query params.
 * Shared by getMeasurements and deleteMeasurementsBulk.
 */
function buildMeasurementFilter(req) {
  const {
    from,
    to,
    lat,
    lng,
    radius,
    radius_m,
    sensorId,
    userId
  } = req.query;

  // Determine user_id filter: admin can specify userId, others use their own
  const effectiveUserId = (req.user.role === 'admin' && userId)
    ? userId
    : req.user._id;

  const filter = {
    user_id: effectiveUserId
  };

  // Filter by sensorId if provided
  if (sensorId) {
    filter.measurements = {
      $elemMatch: {
        sensor_id: isNaN(sensorId) ? sensorId : parseInt(sensorId)
      }
    };
  }

  // Filtro por rango de fechas
  if (from || to) {
    filter.timestamp = {};
    if (from) filter.timestamp.$gte = new Date(from);
    if (to) filter.timestamp.$lte = new Date(to);
  }

  // Filtro geoespacial usando fórmula de Haversine
  let haversineQuery = {};
  const radiusKm = radius ? parseFloat(radius) : (radius_m ? parseFloat(radius_m) / 1000 : null);

  if (lat && lng && radiusKm) {
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
          radiusKm
        ]
      }
    };
  }

  const query = Object.keys(haversineQuery).length > 0
    ? { $and: [filter, haversineQuery] }
    : filter;

  return query;
}

/**
 * Build a measurement document from request item fields.
 */
function buildMeasurementDoc(item, effectiveUserId) {
  return {
    user_id: effectiveUserId,
    client_measurement_id: item.client_measurement_id || null,
    device_id: item.device_id || null,
    timestamp: item.timestamp ? new Date(item.timestamp) : new Date(),
    timestamp_device_ms: item.timestamp_device_ms || null,
    source: item.source || null,
    location: item.location || { lat: null, long: null },
    location_used: item.location_used || false,
    capture_with_gps: item.capture_with_gps || false,
    notebook_id: item.notebook_id || null,
    measurements: item.measurements || [],
    notes: item.notes || null,
  };
}

/**
 * Validate sensor_payload (measurements array) items.
 * Throws on invalid data.
 */
function validateSensorPayload(measurements) {
  if (!measurements || !Array.isArray(measurements)) return;
  for (const m of measurements) {
    if (typeof m.value !== 'number' || isNaN(m.value)) {
      throw new Error(`Invalid measurement value: ${m.value}. All values must be numeric.`);
    }
    if (m.sensor_id === undefined || m.sensor_id === null) {
      throw new Error('Each measurement must have a sensor_id');
    }
  }
}

/**
 * @api {post} /api/measurements Create Measurement
 * @apiName CreateMeasurement
 * @apiGroup Measurements
 * @apiVersion 2.0.0
 *
 * @apiDescription Create a new measurement. Supports idempotency via client_measurement_id.
 *
 * @apiHeader {String} Authorization Bearer JWT token
 *
 * @apiBody {String} [client_measurement_id] Client-generated unique ID for idempotency
 * @apiBody {String} [user_id] User ID (admin only)
 * @apiBody {String} [device_id] Device identifier
 * @apiBody {String} [timestamp] ISO8601 timestamp (defaults to server time)
 * @apiBody {Number} [timestamp_device_ms] Device timestamp in milliseconds
 * @apiBody {String} [source] Source of measurement (e.g. 'manual', 'ble', 'scheduled')
 * @apiBody {Object} [location] Location {lat, long}
 * @apiBody {Boolean} [location_used=false] Whether location was used
 * @apiBody {Boolean} [capture_with_gps=false] Whether GPS was active during capture
 * @apiBody {String} [notebook_id] Reference to a notebook
 * @apiBody {Object[]} measurements Array of sensor measurements
 * @apiBody {Number|String} measurements.sensor_id Sensor ID
 * @apiBody {Number} measurements.value Measurement value
 * @apiBody {String} [notes] Optional notes
 *
 * @apiSuccess (201) {String} status "inserted"
 * @apiSuccess (201) {Object} measurement Created measurement object
 * @apiSuccess (200) {String} status "duplicated"
 * @apiSuccess (200) {Object} measurement Existing measurement object
 *
 * @apiError (400) {String} error Validation error
 * @apiError (401) Unauthorized
 */
exports.createMeasurement = async (req, res) => {
  try {
    validateSensorPayload(req.body.measurements);

    const effectiveUserId = (req.user.role === 'admin' && req.body.user_id)
      ? req.body.user_id
      : req.user._id;

    // Idempotency check
    if (req.body.client_measurement_id) {
      const existing = await Measurement.findOne({
        user_id: effectiveUserId,
        client_measurement_id: req.body.client_measurement_id
      });
      if (existing) {
        return res.status(200).json({ status: 'duplicated', measurement: existing });
      }
    }

    const measurement = new Measurement(buildMeasurementDoc(req.body, effectiveUserId));
    await measurement.save();
    res.status(201).json({ status: 'inserted', measurement });
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
 * @apiDescription Get paginated measurements with optional filtering
 *
 * @apiHeader {String} Authorization Bearer JWT token
 *
 * @apiQuery {String} [from] Start timestamp (ISO 8601)
 * @apiQuery {String} [to] End timestamp (ISO 8601)
 * @apiQuery {Number} [lat] Latitude for radius filtering
 * @apiQuery {Number} [lng] Longitude for radius filtering
 * @apiQuery {Number} [radius] Radius in km
 * @apiQuery {Number} [radius_m] Radius in meters
 * @apiQuery {String|Number} [sensorId] Filter by sensor ID
 * @apiQuery {String} [userId] Filter by user ID (admin only)
 * @apiQuery {Number} [page=1] Page number
 * @apiQuery {Number} [limit=20] Items per page
 *
 * @apiSuccess {Number} total Total count
 * @apiSuccess {Number} page Current page
 * @apiSuccess {Number} limit Items per page
 * @apiSuccess {Object[]} measurements Array of measurement objects
 *
 * @apiError (500) {String} error Error message
 * @apiError (401) Unauthorized
 */
exports.getMeasurements = async (req, res) => {
  const { page = 1, limit = 20 } = req.query;

  try {
    const query = buildMeasurementFilter(req);

    const total = await Measurement.countDocuments(query);

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
 * @apiHeader {String} Authorization Bearer JWT token
 * @apiParam {String} id Measurement ID
 *
 * @apiSuccess {Object} measurement Measurement object
 * @apiError (404) {String} message Not found
 * @apiError (403) {String} message Not authorized
 */
exports.getMeasurementById = async (req, res) => {
  try {
    const measurement = await Measurement.findById(req.params.id);

    if (!measurement) {
      return res.status(404).json({ message: 'Medición no encontrada' });
    }

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
 * @apiHeader {String} Authorization Bearer JWT token
 * @apiParam {String} id Measurement ID
 *
 * @apiSuccess {String} message Success
 * @apiError (404) {String} message Not found
 * @apiError (403) {String} message Not authorized
 */
exports.deleteMeasurement = async (req, res) => {
  try {
    const measurement = await Measurement.findById(req.params.id);

    if (!measurement) {
      return res.status(404).json({ message: 'Medición no encontrada' });
    }

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
 * @api {delete} /api/measurements Bulk Delete Measurements
 * @apiName BulkDeleteMeasurements
 * @apiGroup Measurements
 * @apiVersion 1.0.0
 *
 * @apiDescription Delete multiple measurements matching filters. Requires X-Confirm: true header.
 *
 * @apiHeader {String} Authorization Bearer JWT token
 * @apiHeader {String} X-Confirm Must be "true"
 *
 * @apiSuccess {Number} deleted Count deleted
 * @apiError (400) {String} error Missing confirmation or filters
 */
exports.deleteMeasurementsBulk = async (req, res) => {
  if (req.headers['x-confirm'] !== 'true') {
    return res.status(400).json({
      error: 'Bulk delete requires confirmation. Set header X-Confirm: true'
    });
  }

  const { from, to, lat, lng, radius, radius_m, sensorId, userId } = req.query;
  const hasFilter = from || to || (lat && lng && (radius || radius_m)) || sensorId || userId;

  if (!hasFilter) {
    return res.status(400).json({
      error: 'At least one filter is required for bulk delete (from, to, sensorId, lat/lng/radius, userId)'
    });
  }

  try {
    const query = buildMeasurementFilter(req);
    const result = await Measurement.deleteMany(query);
    res.status(200).json({ deleted: result.deletedCount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * @api {patch} /api/measurements/reassign Reassign Measurements (Admin)
 * @apiName ReassignMeasurements
 * @apiGroup Measurements
 * @apiVersion 1.0.0
 *
 * @apiDescription Reassign measurement ownership in bulk. Requires admin role and X-Confirm: true.
 *
 * @apiHeader {String} Authorization Bearer JWT token (admin)
 * @apiHeader {String} X-Confirm Must be "true"
 *
 * @apiBody {String} targetUserId Destination user ID
 * @apiBody {String[]} [measurementIds] Explicit measurement IDs to reassign
 *
 * @apiQuery {String} [from] Start timestamp (ISO 8601)
 * @apiQuery {String} [to] End timestamp (ISO 8601)
 * @apiQuery {Number} [lat] Latitude for radius filtering
 * @apiQuery {Number} [lng] Longitude for radius filtering
 * @apiQuery {Number} [radius] Radius in km
 * @apiQuery {Number} [radius_m] Radius in meters
 * @apiQuery {String|Number} [sensorId] Filter by sensor ID
 * @apiQuery {String} [userId] Source owner user ID (admin only)
 *
 * @apiSuccess {Number} matched Count of measurements matched by selector
 * @apiSuccess {Number} modified Count of measurements reassigned
 */
exports.reassignMeasurementsBulk = async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can reassign measurements' });
  }

  if (req.headers['x-confirm'] !== 'true') {
    return res.status(400).json({
      error: 'Bulk reassign requires confirmation. Set header X-Confirm: true'
    });
  }

  const { targetUserId, measurementIds } = req.body || {};
  if (!targetUserId) {
    return res.status(400).json({ error: 'targetUserId is required' });
  }

  try {
    const targetUser = await User.findById(targetUserId).select('_id');
    if (!targetUser) {
      return res.status(404).json({ error: 'Target user not found' });
    }

    const { from, to, lat, lng, radius, radius_m, sensorId, userId } = req.query;
    const hasFilter = from || to || (lat && lng && (radius || radius_m)) || sensorId || userId;
    const hasMeasurementIds = Array.isArray(measurementIds) && measurementIds.length > 0;

    if (!hasFilter && !hasMeasurementIds) {
      return res.status(400).json({
        error: 'At least one selector is required: measurementIds or filters (from,to,sensorId,lat/lng/radius,userId)'
      });
    }

    const baseQuery = hasFilter ? buildMeasurementFilter(req) : {};
    const query = hasMeasurementIds
      ? { $and: [baseQuery, { _id: { $in: measurementIds } }] }
      : baseQuery;

    const result = await Measurement.updateMany(query, { $set: { user_id: targetUserId } });

    return res.status(200).json({
      matched: result.matchedCount,
      modified: result.modifiedCount,
      targetUserId
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

/**
 * @api {post} /api/measurements/bulk Create Bulk Measurements
 * @apiName CreateBulkMeasurements
 * @apiGroup Measurements
 * @apiVersion 2.0.0
 *
 * @apiDescription Create multiple measurements with idempotency support. Each item reports inserted|duplicated|failed.
 *
 * @apiHeader {String} Authorization Bearer JWT token
 *
 * @apiBody {Object[]} measurements Array of measurement objects (max 50)
 * @apiBody {String} [measurements.client_measurement_id] Client ID for idempotency
 * @apiBody {String} [measurements.device_id] Device identifier
 * @apiBody {String} [measurements.timestamp] ISO8601 timestamp
 * @apiBody {Number} [measurements.timestamp_device_ms] Device timestamp ms
 * @apiBody {String} [measurements.source] Source identifier
 * @apiBody {Object} [measurements.location] Location {lat, long}
 * @apiBody {Boolean} [measurements.location_used] Whether location was used
 * @apiBody {Boolean} [measurements.capture_with_gps] Whether GPS was active
 * @apiBody {String} [measurements.notebook_id] Notebook reference
 * @apiBody {Object[]} measurements.measurements Sensor readings [{sensor_id, value}]
 * @apiBody {String} [measurements.notes] Optional notes
 *
 * @apiSuccess (201) {Object[]} results Per-item results with status inserted|duplicated|failed
 * @apiSuccess (201) {Object} summary Totals: total, inserted, duplicated, failed
 *
 * @apiError (400) {String} error Invalid format or limit exceeded
 * @apiError (401) Unauthorized
 */
exports.createBulkMeasurements = async (req, res) => {
  const { measurements } = req.body;
  const BATCH_LIMIT = 50;

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
  let insertedCount = 0;
  let duplicatedCount = 0;
  let failedCount = 0;

  for (let i = 0; i < measurements.length; i++) {
    const item = measurements[i];

    try {
      validateSensorPayload(item.measurements);

      const effectiveUserId = (req.user.role === 'admin' && item.user_id)
        ? item.user_id
        : req.user._id;

      // Idempotency check
      if (item.client_measurement_id) {
        const existing = await Measurement.findOne({
          user_id: effectiveUserId,
          client_measurement_id: item.client_measurement_id
        });
        if (existing) {
          results.push({ index: i, status: 'duplicated', id: existing._id.toString() });
          duplicatedCount++;
          continue;
        }
      }

      const measurement = new Measurement(buildMeasurementDoc(item, effectiveUserId));
      await measurement.save();

      results.push({ index: i, status: 'inserted', id: measurement._id.toString() });
      insertedCount++;

    } catch (error) {
      results.push({ index: i, status: 'failed', error: error.message });
      failedCount++;
    }
  }

  res.status(201).json({
    results,
    summary: {
      total: measurements.length,
      inserted: insertedCount,
      duplicated: duplicatedCount,
      failed: failedCount
    }
  });
};

// Keep backward compatibility alias
exports.createBatchMeasurements = exports.createBulkMeasurements;
