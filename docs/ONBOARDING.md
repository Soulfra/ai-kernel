# Onboarding & Voice Onboarding

Run `make start` or `node kernel-cli.js welcome` to set up a new vault.
The welcome flow will:

- Create your vault directory
- Provide a QR code URI for pairing or ask you to type `begin here`
- Credit **3 free prompts** to your account
- Display your token balance and a few idea slugs you can run
- Point you to `/status` for server info
- End with the suggestion: *Drop a chatlog or describe a project*

After onboarding you can explore ideas with `node kernel-cli.js run-idea <slug>`.

---

New users can also speak a short prompt which is transcribed by Whisper. The transcript creates `.idea.yaml` stubs in your vault. Pair with the server at `/start` and upload a voice file or record via the dashboard.
