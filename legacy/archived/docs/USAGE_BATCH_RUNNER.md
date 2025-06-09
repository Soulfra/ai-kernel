---
title: Plugin Batch Runner Usage
description: How to use the plugin batch runner for suggestions and LLM automation.
lastUpdated: 2025-06-04
version: 1.0.0
---

# Plugin Batch Runner Usage

## 1. Add Plugins
- Place your LLM or agent plugins in the `/plugins/` directory.
- See `/plugins/README.md` for the plugin API and examples.

## 2. Set Up API Keys
- Copy `.env.example` to `.env` in the project root.
- Add your API keys (e.g., `OPENAI_API_KEY`).
- Never commit your `.env` file to git.

## 3. Run the Batch Runner
```sh
node scripts/core/plugin-batch-runner.js
```
- The runner will load all plugins and process a batch of suggestions.
- Results and errors are logged to the console.

## 4. Interpreting Results
- Each plugin's response to each suggestion is logged.
- Errors (e.g., missing API keys, failed API calls) are surfaced in the output.
- If no plugins are found, you'll see a warning.

## 5. Troubleshooting
- **No plugins found:** Add plugins to `/plugins/` and check their syntax.
- **API key missing:** Set the required key in `.env` and restart the process.
- **Plugin error:** Check the plugin's logs and ensure dependencies are installed.

## 6. Next Steps
- Integrate the batch runner with the dashboard or task log for real-time review.
- Add more plugins for different LLMs, agents, or integrations. 