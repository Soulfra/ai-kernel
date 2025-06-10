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
