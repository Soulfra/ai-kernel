# Vault Expiration

Vault settings may specify an expiration period using `expires_after` (for example `"7d"`). When a vault exceeds this limit `expire-vault.js` moves it to `ghost/`.

Use `make expire user=<uuid>` to check and expire a vault.
To restore a ghosted vault run `make recall ghost=<uuid>-<timestamp>`.
