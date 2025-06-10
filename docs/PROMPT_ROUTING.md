# Prompt Routing

`scripts/router/prompt-router.js` deducts tokens and routes prompts based on tiers.

## Tiers

- `simulated` – no cost, returns a stub response
- `fast` – immediate inline execution (1 token)
- `deep` – asynchronous job (3 tokens)
- `async` – asynchronous job (2 tokens)

Logs are written to `logs/prompt-routing-log.json`. Async jobs are stored in
`vault/<user>/jobs/<id>.json` and `docs/jobs/<id>.md`.

Check status with:

```bash
node kernel-cli.js check-job <id> --user <user>
```
