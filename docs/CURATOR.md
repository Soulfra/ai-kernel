# Vault Curator

`vault-curator.js` reviews each vault and suggests next steps.

Run `make curate user=<id>` to generate:

- `vault/<id>/curation-report.md`
- `vault/<id>/next-actions.json`

Unpaid exports append `unpaid.json` and a log entry in `logs/vault-curator-events.json`.
