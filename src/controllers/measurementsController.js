const Measurement = require('../models/measurement');
const User = require('../models/user');
const mongoose = require('mongoose');

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

function validateMeasurementFilterInputs(req) {
  const { from, to, lat, lng, radius, radius_m, userId, sensorId } = req.query;

  if (from && Number.isNaN(Date.parse(from))) {
    throw new Error('from must be a valid ISO8601 date');
  }

  if (to && Number.isNaN(Date.parse(to))) {
    throw new Error('to must be a valid ISO8601 date');
  }

  if (from && to && new Date(from) > new Date(to)) {
    throw new Error('from must be less than or equal to to');
  }

  if ((lat && !lng) || (!lat && lng)) {
    throw new Error('lat and lng must be provided together');
  }

  if ((radius && radius_m) || ((lat || lng) && !(radius || radius_m))) {
    throw new Error('Use either radius or radius_m with lat/lng');
  }

  if (lat && (Number.isNaN(parseFloat(lat)) || parseFloat(lat) < -90 || parseFloat(lat) > 90)) {
    throw new Error('lat must be a number between -90 and 90');
  }

  if (lng && (Number.isNaN(parseFloat(lng)) || parseFloat(lng) < -180 || parseFloat(lng) > 180)) {
    throw new Error('lng must be a number between -180 and 180');
  }

  if (radius && (!(parseFloat(radius) > 0))) {
    throw new Error('radius must be a positive number');
  }

  if (radius_m && (!(parseFloat(radius_m) > 0))) {
    throw new Error('radius_m must be a positive number');
  }

  if (sensorId !== undefined && sensorId !== null && `${sensorId}`.trim() === '') {
    throw new Error('sensorId cannot be empty');
  }

  if (req.user.role === 'admin' && userId && !mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error('userId must be a valid ObjectId');
  }
}

function hasScopedFilter(req) {
  const { from, to, lat, lng, radius, radius_m, sensorId, userId } = req.query;
  const hasGeo = Boolean(lat && lng && (radius || radius_m));
  const hasAdminUserId = req.user.role === 'admin' && Boolean(userId);
  return Boolean(from || to || sensorId || hasGeo || hasAdminUserId);
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
    validateMeasurementFilterInputs(req);

    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);

    if (Number.isNaN(pageNumber) || pageNumber < 1) {
      return res.status(400).json({ error: 'page must be an integer >= 1' });
    }

    if (Number.isNaN(limitNumber) || limitNumber < 1 || limitNumber > 200) {
      return res.status(400).json({ error: 'limit must be an integer between 1 and 200' });
    }

    const query = buildMeasurementFilter(req);

    const total = await Measurement.countDocuments(query);

    const measurements = await Measurement.find(query)
      .sort({ timestamp: -1 })
      .skip((pageNumber - 1) * limitNumber)
      .limit(limitNumber);

    res.status(200).json({
      total,
      page: pageNumber,
      limit: limitNumber,
      totalPages: Math.ceil(total / limitNumber),
      measurements
    });
  } catch (error) {
    const status = /must be|Use either|provided together|less than/.test(error.message) ? 400 : 500;
    res.status(status).json({ error: error.message });
  }
};

/**
 * @api {get} /api/measurements/export Export Measurements
 * @apiName ExportMeasurements
 * @apiGroup Measurements
 * @apiVersion 1.0.0
 *
 * @apiDescription Export filtered measurements in JSON or CSV format.
 *
 * @apiHeader {String} Authorization Bearer JWT token
 *
 * @apiQuery {String="json","csv","xlsx"} [format=json] Export format
 * @apiQuery {String} [from] Start timestamp (ISO 8601)
 * @apiQuery {String} [to] End timestamp (ISO 8601)
 * @apiQuery {Number} [lat] Latitude for radius filtering
 * @apiQuery {Number} [lng] Longitude for radius filtering
 * @apiQuery {Number} [radius] Radius in km
 * @apiQuery {Number} [radius_m] Radius in meters
 * @apiQuery {String|Number} [sensorId] Filter by sensor ID
 * @apiQuery {String} [userId] Filter by user ID (admin only)
 */
exports.exportMeasurements = async (req, res) => {
  try {
    const format = (req.query.format || 'json').toLowerCase();
    const query = buildMeasurementFilter(req);

    const measurements = await Measurement.find(query)
      .sort({ timestamp: -1 })
      .lean();

    if (format === 'xlsx') {
      return res.status(501).json({
        error: 'XLSX export is not available yet. Use format=json or format=csv.'
      });
    }

    if (format === 'csv') {
      const headers = [
        'id',
        'user_id',
        'device_id',
        'timestamp',
        'timestamp_device_ms',
        'source',
        'location_lat',
        'location_long',
        'location_used',
        'capture_with_gps',
        'notebook_id',
        'notes',
        'measurements_json'
      ];

      const escapeCsv = (value) => {
        if (value === null || value === undefined) return '';
        const str = String(value).replace(/"/g, '""');
        return /[",\n]/.test(str) ? `"${str}"` : str;
      };

      const lines = [headers.join(',')];

      for (const m of measurements) {
        const row = [
          m._id,
          m.user_id,
          m.device_id,
          m.timestamp ? new Date(m.timestamp).toISOString() : '',
          m.timestamp_device_ms,
          m.source,
          m.location?.lat,
          m.location?.long,
          m.location_used,
          m.capture_with_gps,
          m.notebook_id,
          m.notes,
          JSON.stringify(m.measurements || [])
        ].map(escapeCsv);

        lines.push(row.join(','));
      }

      const csv = lines.join('\n');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="measurements-export.csv"');
      return res.status(200).send(csv);
    }

    // Default JSON export
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.status(200).json({
      format: 'json',
      total: measurements.length,
      measurements
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
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
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'id must be a valid ObjectId' });
    }

    const measurement = await Measurement.findById(req.params.id);

    if (!measurement) {
      return res.status(404).json({ message: 'Medición no encontrada' });
    }

    if (req.user.role !== 'admin' && measurement.user_id.toString() !== req.user._id.toString()) {
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
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'id must be a valid ObjectId' });
    }

    const measurement = await Measurement.findById(req.params.id);

    if (!measurement) {
      return res.status(404).json({ message: 'Medición no encontrada' });
    }

    if (req.user.role !== 'admin' && measurement.user_id.toString() !== req.user._id.toString()) {
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

  try {
    validateMeasurementFilterInputs(req);

    if (!hasScopedFilter(req)) {
      return res.status(400).json({
        error: 'At least one scoped filter is required for bulk delete (from, to, sensorId, lat/lng/radius, userId for admin)'
      });
    }

    const query = buildMeasurementFilter(req);
    const result = await Measurement.deleteMany(query);
    res.status(200).json({ deleted: result.deletedCount });
  } catch (error) {
    const status = /must be|Use either|provided together|less than/.test(error.message) ? 400 : 500;
    res.status(status).json({ error: error.message });
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

  if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
    return res.status(400).json({ error: 'targetUserId must be a valid ObjectId' });
  }

  try {
    const targetUser = await User.findById(targetUserId).select('_id');
    if (!targetUser) {
      return res.status(404).json({ error: 'Target user not found' });
    }

    validateMeasurementFilterInputs(req);

    const hasFilter = hasScopedFilter(req);
    const hasMeasurementIds = Array.isArray(measurementIds) && measurementIds.length > 0;

    if (hasMeasurementIds) {
      const invalidId = measurementIds.find(id => !mongoose.Types.ObjectId.isValid(id));
      if (invalidId) {
        return res.status(400).json({ error: `Invalid measurementId: ${invalidId}` });
      }
    }

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
    const status = /must be|Use either|provided together|less than/.test(error.message) ? 400 : 500;
    return res.status(status).json({ error: error.message });
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
