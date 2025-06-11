# Memory Diffusion

`diffuse-memory.js` converts vault data into portable artifacts. Encoding a file writes a base64 representation with a `.mp4` extension so it can be streamed or synced between devices. Decoding reverses the process.

Usage:

```bash
make diffuse-vault user=<id>
make decode-vault file=<json.mp4>
```

Events are logged to `vault/<uuid>/diffused-history.json` and `logs/memory-fusion-events.json`.

