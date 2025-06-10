# Nightly Claude Loop

`scripts/cron/nightly-reflection.js` runs `make reflect-vault` for each vault. It stores the summary at `vault/<id>/daily.md` and logs the loop metadata to `vault-prompts/<id>/loop.json`.
