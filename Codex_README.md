# Codex Setup Guide

## Setup Instructions
```bash
pip install -r requirements.txt || echo "no Python deps"
npm install
./setup.sh || echo "no setup script"
npm test || echo "no tests defined"
```

## Project Entry Points
- Backend logic: `legacy/scripts/`
- Kernel logic: `legacy/scripts/OGKERNEL/`
- Setup scripts: `setup.sh`

## Notes
All secrets should be stored in `.env`, not committed to the repo.
