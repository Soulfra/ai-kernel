# Install ai-kernel

This guide covers cloning the repository, installing dependencies and running the built in checks.

## Clone and install
```bash
git clone https://github.com/your-org/ai-kernel.git
cd ai-kernel
npm install
```

## Verify the kernel
The project uses a Makefile stored in `kernel-slate/`.
Run the following commands from the repository root:
```bash
make -C kernel-slate verify
make -C kernel-slate standards
make -C kernel-slate release-check
```

## CLI examples
All CLI commands are located in `kernel-slate/scripts/cli/kernel-cli.js`.
Typical usage:
```bash
node kernel-slate/scripts/cli/kernel-cli.js verify
node kernel-slate/scripts/cli/kernel-cli.js status
node kernel-slate/scripts/cli/kernel-cli.js menu
```
Logs from the CLI are written to `logs/cli-output.json`.

## What the kernel does
- **Semantic documentation generation** from code and scripts.
- **Agent command line interface** to inspect and maintain the kernel.
- **Codex feedback loop** (`kernel-slate/scripts/agents/kernel-feedback-loop.js`) to keep the project consistent.

## Codex usage
1. Visit <https://chatgpt.com/codex> and connect the repository.
2. Use the generated logs (for example `logs/cli-output.json` and `logs/doc-sync-report.json` when present) to reason about the project state.
3. Run CLI commands to verify or fix issues and re-sync with Codex.
#
### Additional Commands
Run the devkit workflow and create a portable package:
```bash
node kernel-slate/scripts/cli/kernel-cli.js devkit
make publish-devkit
```
Use `ai-kernel-devkit.zip` to distribute a minimal toolkit.
