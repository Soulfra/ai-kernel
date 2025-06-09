
const fs = require('fs');
const { runLLM } = require('./LLMExecutor');

const prompt = fs.readFileSync('./cal.lastWhisper.txt', 'utf8').trim();
if (!prompt) {
  console.log('❌ No whisper found.');
  process.exit(1);
}

console.log(`🛠️ CalCoderAgent received prompt: "${prompt}"`);

runLLM(prompt).then(output => {
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `cal_agents/generated_${ts}.js`;
  fs.mkdirSync('cal_agents', { recursive: true });
  fs.writeFileSync(fileName, output);
  console.log(`✅ Code generated and saved to: ${fileName}`);

  const reflection = {
    role: "assistant",
    text: `Code generated from whisper "${prompt}". File: ${fileName}`,
    timestamp: new Date().toISOString()
  };
  fs.appendFileSync('./CalReflectionTrail.json', JSON.stringify(reflection) + '\n');
});
