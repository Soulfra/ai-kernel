# ai-kernel

ai-kernel is a self-healing, AI-assisted development kernel that runs modular agents to codify your system's structure. Clone the repo and run `npm install`, then verify the environment with `make -C kernel-slate verify`. Launch the menu with `node kernel-slate/scripts/cli/kernel-cli.js menu` to install or run agents. Every command logs to `./logs` so Codex or Claude can fix issues based on real output.

**This repo is Codex-enhanced. Use logs/*.json for AI assist.**

The project contains the final snapshot of the ai-kernel system. It focuses on semantic documentation generation, an agent command line interface, and Codex-driven feedback loops.

## Features
- Self-healing backup orchestrator with modular agent framework.
- CLI commands to install, verify and manage agents.
- Semantic documentation and summary generation from scripts.
- Codex feedback loop using `kernel-slate/scripts/agents/kernel-feedback-loop.js`.
- Logged workflow ready for export.

## Documentation
- [Install and Usage Guide](./InstallKernel.md)
- [Release Checklist](./RELEASE_CHECKLIST.md)
- [Final Kernel Status](./docs/final-kernel-status.md)
