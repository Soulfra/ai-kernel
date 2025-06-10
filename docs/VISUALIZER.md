# Vault Visualizer

`vault-visualizer.js` turns a vault snapshot into a short `.mp4` animation.
Run `make animate user=<id>` or `make vault-video user=<id>` to produce
`vault/<id>/visual/vault-<timestamp>.mp4`.

Render activity is appended to `vault/<id>/render-history.json` and
`logs/video-events.json`.
