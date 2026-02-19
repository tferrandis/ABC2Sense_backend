const mongoose = require('mongoose');

exports.getHealth = async (req, res) => {
  try {
    const dbState = mongoose.connection.readyState;
    const dbOk = dbState === 1;

    res.status(dbOk ? 200 : 503).json({
      success: dbOk,
      service: 'abc2sense_backend',
      status: dbOk ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      checks: {
        database: {
          ok: dbOk,
          state: dbState
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: 'error',
      message: 'Health check failed',
      error: error.message
    });
  }
};

exports.getMetrics = async (req, res) => {
  try {
    const mem = process.memoryUsage();

    res.json({
      success: true,
      metrics: {
        uptimeSeconds: Math.floor(process.uptime()),
        nodeVersion: process.version,
        memory: {
          rss: mem.rss,
          heapTotal: mem.heapTotal,
          heapUsed: mem.heapUsed,
          external: mem.external
        },
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Metrics collection failed',
      error: error.message
    });
  }
};
