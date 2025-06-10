# Vault Versioning

`rotate-vault.js` archives the active vault to `vault/<uuid>-<n>/` and creates a fresh head at `vault/<uuid>/`. Lineage entries are saved under `vault/<uuid>/lineage.json` and all rotations are appended to `logs/vault-rotations.json`.

Run `make rotate user=<uuid> reason="session complete"` to rotate a vault.
