# Agent Protocol

This runtime routes prompts through a token based economy. Each prompt is evaluated by the cost engine and then billed against the user's vault balance.

## Prompt billing flow
1. `cost-engine.js` estimates tokens for the prompt and applies a 10% protocol markup.
2. The provider router attempts the preferred provider and falls back to others if needed.
3. Usage is logged per user in `vault/<user>/usage.json` and global estimates are stored in `logs/prompt-cost-estimates.json`.

## Referral and commission
- Every user vault contains `settings.json` with `commission_rate` and optional `referrer_id`.
- When a referred user spends tokens, the referrer earns the configured percentage. Earnings are tracked in `vault/<referrer>/earnings.json`.

## Token tiers
- `simulated` – 0 tokens
- `fast` – 1 token
- `async` – 2 tokens
- `deep` – 3 tokens

## Agent registry and pricing
Users can fork agents, set a price, or whitelist buyers in `agent-registry.json`. Prices are denominated in tokens and deducted on execution. Refer to existing Makefile targets to build or run agents.

## Mobile sync
`make sync-vault username=<user>` updates `vault/<user>/device.json` and records history in `logs/mobile-sync-history.json`.
Run `node kernel-cli.js sync-device --user <user>` to append device metadata to `vault/<user>/devices.json`.

Background agent queues are managed with:
```bash
make queue-agent path=<agent.zip> user=<user>
make run-queue user=<user>
```
Queue results write to `vault/<user>/background-agent-log.json` and `logs/agent-queue-status.json`.
