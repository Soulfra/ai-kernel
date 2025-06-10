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

vault-status:
        node scripts/vault-cli.js status $(username)

go:
        make vault-status username=$(username)
        node scripts/go.js $(username)
