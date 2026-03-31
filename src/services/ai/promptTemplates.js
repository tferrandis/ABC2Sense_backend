function jsonBlock(schemaHint, context) {
  return `You are an agronomic assistant for ABC2Sense.
Return ONLY valid JSON. No markdown. No extra text.
If data is insufficient, return {"status":"insufficient_data","reason":"..."}.
Never invent weather or external facts not present in input.
Schema hint: ${schemaHint}
Input context:\n${JSON.stringify(context)}`;
}

function analysisComparePrompt(context) {
  return {
    version: 'analysis_compare_v1',
    prompt: jsonBlock(
      '{status, summary, mode, comparison:{period,current_vs_previous}, trends:[{metric,direction,delta}], anomalies:[{type,severity,evidence}], recommendations:[{action,why,priority,confidence}]}',
      context
    )
  };
}

function measurementReportPrompt(context) {
  return {
    version: 'measurement_report_v1',
    prompt: jsonBlock(
      '{status, summary, measurement_assessment, risks:[{risk,severity,reason}], recommendations:[{action,why,priority,confidence}], confidence}',
      context
    )
  };
}

function presetSuggestPrompt(context) {
  return {
    version: 'preset_suggest_v1',
    prompt: jsonBlock(
      '{status, crop_type, suggestions:[{name,description,activeSensors:[number],indifferentSensors:[number],ranges:{metric:{min,max}},confidence,reason}] }',
      context
    )
  };
}

function sensorChatPrompt(context) {
  return {
    version: 'sensor_chat_guarded_v1',
    prompt: `You are a restricted ABC2Sense sensor assistant.\nAllowed topics: sensor types, variable meaning, how to capture data, interpretation basics.\nDisallowed: legal/medical/financial advice, hacking, dangerous instructions, unrelated topics.\nIf outside scope, answer with: {"status":"out_of_scope","message":"Solo puedo ayudar con sensores/cultivo en ABC2Sense."}.\nReturn ONLY JSON: {status, answer, references:[...], safety_note}.\nContext: ${JSON.stringify(context)}`
  };
}

module.exports = {
  analysisComparePrompt,
  measurementReportPrompt,
  presetSuggestPrompt,
  sensorChatPrompt
};
