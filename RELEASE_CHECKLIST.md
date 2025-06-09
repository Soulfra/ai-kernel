# Release Checklist

- [ ] Repo name and folder structure is unified (`ai-kernel/`)
- [ ] All make targets pass
- [ ] All CLI commands are registered in `kernel-cli.js`
- [ ] No `.md` files are dead links (based on `doc-sync-report.json`)
- [ ] All agents in `agent.yaml` have docs and are testable
- [ ] requirements.txt exists and is accurate
- [ ] Codex has latest logs and prompt routing
- [ ] `make export` works and produces `kernel-release.zip`
- [ ] All standards checks pass (`make standards` ✅)
