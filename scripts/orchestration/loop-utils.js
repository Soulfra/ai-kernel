// @agent: diagnostics
// @orchestrator: recovery
// @origin: legacy-rescue

function runLoop(fn, intervalMs = 1000) {
  let active = true;
  async function loop() {
    while (active) {
      await fn();
      await new Promise(res => setTimeout(res, intervalMs));
    }
  }
  loop();
  return () => { active = false; };
}

module.exports = { runLoop };
