# Web UI

Run `make serve` and open `/start` to pair your local vault. The dashboard lives in the `frontend/` folder and is served by `boot-server.js`.

Pages:
- `/start` – shows a QR code and Begin button to create or pair a vault.
- `/dashboard` – displays vault ID, token balance, recent voice transcripts and suggested ideas. You can record audio or upload a file for voice preview.
- `/upload` – drag and drop chat logs, idea files or code archives. The files are processed by existing upload agents and trigger vault reflection.
- `/vault/<id>` – JSON view of vault usage and logs.
- `/marketplace` – preview exported ideas with a Remix link.

These pages are mobile friendly and use Tailwind CSS.
