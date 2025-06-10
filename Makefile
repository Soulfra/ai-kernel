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

freeze:
        make verify
        make standards
        make reflect-vault user=$(user)
        mkdir -p build
        zip -r build/ai-kernel-v1.zip . -x '*.git*' '*node_modules*' 'logs/*' 'build/*'
        git tag v1.0.0-kernel

notify:
        node scripts/notify.js
