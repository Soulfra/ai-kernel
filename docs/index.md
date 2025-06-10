# ai-kernel Portal

Welcome to the private ai-kernel runtime.

- [Install Guide](../InstallKernel.md)
- [Release Checklist](../RELEASE_CHECKLIST.md)
- [Final Status](./final-kernel-status.md)
- [Legacy Insights](./legacy-insights.md)

## API Endpoints

- `/api/keys/status` – view which key source is active
- `/api/agents` – list installed agents
- `/api/docs` – this documentation
- `/api/run` – POST JSON `{ "cmd": "verify" }`
- `/api/run-idea` – POST JSON `{ "path": "ideas/foo.idea.yaml" }`
  - add `?user=<name>` to charge a vault user
- `/api/status` – vault stats for a user

## Idea Summaries

See recovered ideas in [docs/ideas](./ideas/).
Read about the [user vault](./VAULT.md) for token pricing (1 token per idea run) and BYOK setup.

Example idea files live under `ideas/`. Try `unified-migration-system.idea.yaml`, `chatlog-parser-feature.idea.yaml`, or `advanced-logging-feature.idea.yaml`.

## Example workflow

1. `node kernel-cli.js ignite`
2. `curl http://localhost:3077/api/keys/status`
3. `curl -X POST -d '{"cmd":"devkit --use-byok"}' http://localhost:3077/api/run`
4. `curl -X POST -d '{"path":"ideas/unified-migration-system.idea.yaml"}' http://localhost:3077/api/run-idea`
5. `make go username=<name>`

User vaults live under `/vault/<name>/`.
