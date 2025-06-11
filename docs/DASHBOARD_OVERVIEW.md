# Dashboard Overview

`/dashboard` loads data from `/dashboard?json=1` and shows:

- Vault ID and current token balance
- Last voice transcript and suggested `.idea.yaml`
- Claude reflection output from `vault-prompts/<vault>/claude-reflection.json`
- Button to run `reflect-vault` via the server
- Voice recorder and upload field to preview voice agents

All information is read from the local `vault/` directory so you can monitor sync status and exported agents.
