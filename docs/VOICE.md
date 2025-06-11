# Voice Agent

Upload a `.wav` or `.m4a` file with `make voice file=<path> user=<id>` or POST to `/voice-upload`.
The recording is transcribed with Whisper and logged to `vault/<id>/voice-log.json` and `vault-prompts/<id>/claude-transcripts.json`.
