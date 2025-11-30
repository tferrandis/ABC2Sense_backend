// controllers/sensorController.js
const Sensor = require('../models/sensor');
const SensorDefinition = require('../models/sensorDefinition');

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

exports.getSensorsByUser = async (req, res) => {
  const { userId } = req.params;
  try {
    const sensors = await Sensor.find({ user: userId });
    res.status(200).json(sensors);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getSensorDefinitions = async (req, res) => {
  try {
    const sensors = await SensorDefinition.find({});
    res.status(200).json(sensors);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
