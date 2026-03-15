const Measurement = require('../../models/measurement');
const Notebook = require('../../models/notebook');

function avg(values) {
  if (!values.length) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function summarizeMetrics(measurements) {
  const byMetric = new Map();

  for (const m of measurements) {
    for (const item of m.measurements || []) {
      const key = String(item.sensor_id);
      if (!byMetric.has(key)) byMetric.set(key, []);
      byMetric.get(key).push(item.value);
    }
  }

  return Array.from(byMetric.entries()).map(([metric, values]) => ({
    metric,
    min: Math.min(...values),
    max: Math.max(...values),
    mean: avg(values),
    samples: values.length
  }));
}

async function loadNotebookContext({ userId, notebookId }) {
  if (!notebookId) return null;
  return Notebook.findOne({ _id: notebookId, user_id: userId }).lean();
}

async function buildAnalysisContext({ userId, notebookId, currentFrom, currentTo, previousFrom, previousTo, mode = 'auto' }) {
  const notebook = await loadNotebookContext({ userId, notebookId });

  const baseFilter = { user_id: userId };
  if (notebookId) baseFilter.notebook_id = String(notebookId);

  const currentFilter = {
    ...baseFilter,
    timestamp: { $gte: new Date(currentFrom), $lte: new Date(currentTo) }
  };

  const previousFilter = previousFrom && previousTo
    ? {
        ...baseFilter,
        timestamp: { $gte: new Date(previousFrom), $lte: new Date(previousTo) }
      }
    : null;

  const [currentMeasurements, previousMeasurements] = await Promise.all([
    Measurement.find(currentFilter).sort({ timestamp: 1 }).lean(),
    previousFilter ? Measurement.find(previousFilter).sort({ timestamp: 1 }).lean() : Promise.resolve([])
  ]);

  const inferredMode = mode !== 'auto'
    ? mode
    : (notebook?.type === 'area' ? 'spatial' : 'single_point');

  return {
    mode: inferredMode,
    notebook: notebook
      ? {
          id: notebook._id,
          name: notebook.name,
          type: notebook.type,
          area: notebook.area || null,
          description: notebook.description || null
        }
      : null,
    periods: {
      current: { from: currentFrom, to: currentTo, samples: currentMeasurements.length },
      previous: { from: previousFrom || null, to: previousTo || null, samples: previousMeasurements.length }
    },
    current_summary: summarizeMetrics(currentMeasurements),
    previous_summary: summarizeMetrics(previousMeasurements)
  };
}

module.exports = {
  buildAnalysisContext
};
