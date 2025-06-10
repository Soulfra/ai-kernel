# Trust Router Protocol

`vault-router.js` handles encrypted prompt routing. It accepts `.idea.yaml`, `.prompt.json` and `.chatlog.md` files and generates a one time key stored under `keys/<uuid>/<timestamp>.key`.

The router encrypts all files with AES‑256‑GCM and sends only:

```json
{ encrypted_payload, vault_hash, key_ref, runtime_tag }
```

Logs are written to `logs/transmission-log.json` and `vault/<uuid>/transmission-history.json`. A copy of each encrypted message is stored under `middle/<uuid>/<timestamp>.json` for later decryption by the vault owner or an admin key.

