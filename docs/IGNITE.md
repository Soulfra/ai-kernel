# Kernel Ignite Guide

`ignite` boots the ai-kernel in server mode. It verifies the environment, runs standards checks and starts a minimal API server.

## Running the server

```bash
node kernel-cli.js ignite
```

This starts the Express server on `http://localhost:3077` with routes:
- `/status` – current kernel status
- `/agents` – installed agents list
- `/logs` – recent log snippets
- `/run/:cmd` – run a CLI command (`verify`, `shrinkwrap`, `devkit`)
- `/api/*` – JSON API endpoints

## CLI vs Hosted

`kernel-cli.js` can run locally or be exposed from a hosted environment. When hosted, call the `/api/run` route to execute commands remotely.

### BYOK flag

Use `--use-byok` to force your own API keys:

```bash
node kernel-cli.js ignite --use-byok
```

This sets `USE_BYOK=true` so the router pulls keys from your `.env` file. Without the flag, hosted keys are used.

## Connecting Claude/Codex

Both Claude and Codex can watch the `logs/` directory. Provider activity is stored in `logs/provider-activity.json` and CLI output in `logs/cli-output.json`. Point your tooling at these files for continuous feedback.

## Installing Agents

Place `.agent.zip` or `.idea.yaml` files in `input/` or `install/` before starting the server. They will be loaded automatically and registered with your API keys from `.env`.

## Publishing Agents

To publish a new agent, push the `.agent.zip` or YAML definition to a private repository or marketplace of your choice. The kernel can fetch and install from these packages using the install scripts.

## Running Ideas

Execute a `.idea.yaml` file directly:

```bash
node kernel-cli.js run-idea ideas/unified-migration-system.idea.yaml --use-byok
```

The same action is available remotely:

```bash
curl -X POST -H "Content-Type: application/json" \
  -d '{"path":"ideas/unified-migration-system.idea.yaml","byok":true}' \
  http://localhost:3077/api/run-idea
```

Results are written under `logs/idea-runtime/` and documented in `docs/ideas/`.
Internal templates are loaded locally via `scripts/internal/prompt-injector.js`.
