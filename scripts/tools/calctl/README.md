# CalCTL — Soulfra DevSuite CLI

CalCTL is the official developer interface for the Soulfra Trust OS.  
It runs all trust actions, loop diagnostics, token syncs, and ritual memory tools.

---

## 🧠 What It Does

- Certifies trust memory across your agent stack
- Runs loops, freezes snapshots, and whispers Arty reflections
- Tracks tokens, licenses, and trust decay
- Powers invite-based rituals and tier unlocks

---

## 🚀 Install

```bash
git clone https://github.com/Soulfra/calctl
cd calctl
node CalShell.js
```

Soon:
```bash
npx calctl
```

---

## 🎮 Core CLI Commands

| Command                        | Purpose                                      |
|-------------------------------|----------------------------------------------|
| `calctl init`                 | Boot trust memory + token check              |
| `calctl trust:certify`        | Echo current memory trust                    |
| `calctl loop:run`             | Replay loop from sealed memory               |
| `calctl tokens:check`         | Show available token balance                 |
| `calctl tokens:topup`         | Open Stripe or URL to buy more credits       |
| `calctl ritual:seal`          | Freeze your loop state as a ritual           |
| `calctl whisper:init`         | Trigger Arty + Cal whisper memory (opt-in)   |

---

## 🪄 Devmode (Optional)

To activate full reflection mode (Cal + Arty):
```bash
node calctl-devmode-init.js
```

Whisper memory and trust traces will begin syncing locally.  
This never publishes unless you explicitly export a `.ritual`.

---

## 💳 Token Licensing

CalCTL enforces token-based trust actions.

- 10+ core tools are free
- Advanced ones require tokens or `.license.cal` pre-grants
- Use `tokens:check`, `tokens:spend`, or `tokens:topup` at any time

---

## 📜 License

This repo operates under the **Soulfra Trust License** (see `LICENSE.trust`)  
The MIT fallback applies only to base tools. All memory systems, whispers, and overlays are sealed unless unlocked.

---

> Soulfra Tier 10: Certified. Sealed. Scalable. Sacred.
