# User Vault

Each runtime user has a personal vault under `vault/<username>/` (not committed to git). The vault stores:

- `ideas/` – promoted idea files
- `tokens.json` – current token balance
- `env.json` – optional BYOK keys
- `usage.json` – CLI and API activity log

Use the Makefile helpers to manage vault balances:

```bash
make create-user username=matthew
make deposit username=matthew amount=50
make vault-status username=matthew
```

When running `run-idea`, one token is deducted. Execution is blocked if the balance is zero.
If `--use-byok` is set, API keys are loaded from `vault/<username>/env.json`.

## Agent generation

Turn a promoted idea into a starter agent package:

```bash
node kernel-cli.js build-agent-from-idea <slug> --user <name>
```

The archive is saved to `vault/<name>/agents/<slug>.agent.zip` and logged to `logs/agent-builder-log.json`.

## Vault reflection

Analyze your vault usage and get suggestions:

```bash
node kernel-cli.js reflect-vault --user <name>
```

Results are written to `docs/vault/<name>-next.md` and `logs/vault-reflection.json`.
