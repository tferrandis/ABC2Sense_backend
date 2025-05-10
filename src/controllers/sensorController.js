// controllers/sensorController.js
const Sensor = require('../models/sensor');
const SensorDefinition = require('../models/sensorDefinition');

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

const R = 6371000; 

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

    const measures = await Sensor.find(query)
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Sensor.countDocuments(query);

    res.status(200).json({
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      measures
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// Crear definición de sensor
exports.createSensorDefinition = async (req, res) => {
  const { sensorId, title, measure,unit,description } = req.body;
  try {
    const existing = await SensorDefinition.findOne({ sensorId });
    if (existing) return res.status(400).json({ message: "Sensor ID already exists" });

    const def = new SensorDefinition({ sensorId, title, description,unit, measure });
    await def.save();
    res.status(201).json(def);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Obtener definiciones de sensores
exports.getSensorDefinitions = async (req, res) => {
  try {
    const sensors = await SensorDefinition.find({});
    res.status(200).json(sensors);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
