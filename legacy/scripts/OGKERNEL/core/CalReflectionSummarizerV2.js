
const fs = require('fs');

function summarize() {
  if (!fs.existsSync('CalReflectionTrail.json')) {
    console.error('❌ No memory trail found.');
    return;
  }

  const lines = fs.readFileSync('CalReflectionTrail.json', 'utf8').split('\n').filter(Boolean);
  const reflections = lines.map(line => {
    try { return JSON.parse(line); } catch { return null; }
  }).filter(Boolean);

  const summary = {
    whisper_count: 0,
    agent_responses: 0,
    unique_commands: new Set(),
    system_reflections: 0
  };

  reflections.forEach(r => {
    const text = r.text || '';
    if (r.role === 'user') {
      summary.whisper_count++;
      if (text.length > 10) summary.unique_commands.add(text.slice(0, 30));
    }
    if (r.role === 'assistant' || r.role === 'agent') {
      summary.agent_responses++;
    }
    if (r.role === 'system') {
      summary.system_reflections++;
    }
  });

  summary.unique_commands = Array.from(summary.unique_commands);
  summary.last_updated = new Date().toISOString();

  fs.writeFileSync('cal_memory_summary.json', JSON.stringify(summary, null, 2));
  console.log('🧠 cal_memory_summary.json regenerated.');
}

summarize();
