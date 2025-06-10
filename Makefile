export-slim:
	zip -r ai-kernel-slim.zip scripts docs agent.yaml Makefile package.json kernel-slate/scripts/cli/kernel-cli.js \
		-x 'legacy/*' 'logs/*' '.git/*' 'node_modules/*' '*test*' '*backup*'

publish-devkit:
	node kernel-slate/scripts/cli/kernel-cli.js devkit
	zip -r ai-kernel-devkit.zip scripts docs agent.yaml kernel-slate/scripts/cli/kernel-cli.js \
                -x '*logs*' '*node_modules*' '*backup*'

verify:
	make -C kernel-slate verify

standards:
	make -C kernel-slate standards

release-check:
	make -C kernel-slate release-check

run-ideas:
	node scripts/run-idea-e2e.js

promote-idea:
	node kernel-cli.js promote-idea $(slug)

export-approved:
	node scripts/export-approved.js

create-user:
	node scripts/vault-cli.js create $(username)

deposit:
        node scripts/vault-cli.js deposit $(username) $(amount)

topup:
        node scripts/vault-cli.js deposit $(user) $(amount)

subscribe:
        node scripts/vault-cli.js subscribe $(user) $(plan)

billing-summary:
        node scripts/vault-cli.js billing-summary $(user)

generate-qr:
	node kernel-cli.js generate-qr

check-pairing:
        node kernel-cli.js check-pairing $(id)

sanitize:
        node kernel-cli.js sanitize

snapshot:
        node kernel-cli.js snapshot

vault-snapshot:
        node scripts/vault-snapshot.js $(user)

vault-restore:
        node scripts/vault-restore.js $(file)

voice:
        node scripts/agent/claude-voice.js $(file) $(user)

enrich-ideas:
        node scripts/daemon/idea-enrichment.js

vault-status:
	node scripts/vault-cli.js status $(username)

go:
	make vault-status username=$(username)
	node scripts/go.js $(username)

marketplace:
	node scripts/marketplace-preview.js

reflect-vault:
        node kernel-cli.js reflect-vault --user $(user)

sync-vault:
        node scripts/sync-vault.js $(username)

queue-agent:
        node kernel-cli.js queue-agent $(path) --user $(user)

run-queue:
        node kernel-cli.js run-queue --user $(user)

start:
        node kernel-cli.js welcome

freeze:
        make verify
        make standards
        make reflect-vault user=$(user)
        node scripts/freeze/freeze-kernel.js
        mkdir -p build
        zip -r build/ai-kernel-v1.zip . -x '*.git*' '*node_modules*' 'logs/*' 'build/*'
        git tag v1.0.0-devkit

notify:
        node scripts/notify.js

rules-view:
        node scripts/core/admin-rule-engine.js view

rules-update:
        node scripts/core/admin-rule-engine.js update $(key)

ignite:
        node scripts/utils/log-compiler.js
        node kernel-cli.js ignite

load-prompt:
        node scripts/admin/format-loader.js load-prompt $(file) $(user)

upload-format:
        node scripts/admin/format-loader.js upload-format $(file) $(user)

serve:
	NODE_ENV=production node scripts/server/boot-server.js

pair:
	node scripts/server/pair-device.js $(user)
	
welcome:
	node kernel-cli.js welcome --user $(user)

prompt-agent:
node scripts/prompt-agent.js $(user) $(prompt)

session-summary:
node scripts/session-summary.js $(user)

self-test-guide:
node scripts/onboarding/self-test-guide.js $(user)
