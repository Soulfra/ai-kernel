module.exports = {
  inject(idea) {
    // This example simply prefixes the idea description.
    // Replace with your own templates in prompt-injector.js (local only).
    const prompt = `INTERNAL INJECTED PROMPT:\n${idea.description}`;
    return { prompt };
  }
};
