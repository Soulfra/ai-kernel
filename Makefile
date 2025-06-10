PORT?=3000
user?=default
slug?=idea
name?=default

launch:
	./launch-agent.sh

serve:
	node boot-server.js

voice:
	node scripts/voice/voice-reflector.js record

unlock:
	node scripts/api/unlock.js $(user)

refer:
	node scripts/api/referral.js $(user)

reflect:
	node scripts/api/reflect-vault.js $(user)

digest:
	node scripts/api/nightly-digest.js $(user)

promote:
	node scripts/api/promote.js $(slug)

animate:
	node scripts/api/animate.js $(slug)

devkit:
	node scripts/api/devkit.js $(user)

set-theme:
	node scripts/api/theme.js $(name) $(user)

diagnostics:
	@echo "Running system diagnostics..."
	@mkdir -p logs
	@echo "Running ESLint..."
	@npx eslint . > logs/lint-errors.txt 2>&1 || true
	@echo "Running tests..."
	@npx jest --silent > logs/test-output.log 2>&1 || true
	@echo "Generating vault summary..."
	@node scripts/api/vault-summary.js > logs/vault-summary.json 2>/dev/null || true
	@echo "Diagnostics complete. Check logs/ directory for results."

redact:
	@echo "Starting redaction process..."
	@node scripts/api/redact.js
	@echo "Redaction complete. Check for .bak files to restore original content if needed."

verify: redact test standards
	@echo "Verification complete"

test:
	@echo "Running tests..."
	@npx jest --silent --passWithNoTests

standards:
	@echo "Running code standards checks..."
	@npx eslint . --fix
	@npx prettier --write "**/*.{js,json,md,yaml,yml}"

.PHONY: launch serve voice unlock refer reflect digest promote animate devkit set-theme diagnostics redact verify test standards
