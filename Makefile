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
        node scripts/onboarding/voice-onboard.js $(file) $(user)

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

guide-speak:
 node scripts/agent/glyph-agent.js speak $(user) $(message)

guide-set:
 node scripts/agent/glyph-agent.js set $(user) $(name)

vault-theme:
 node scripts/vault-theme.js $(user) $(name)

self-test-guide:
node scripts/onboarding/self-test-guide.js $(user)

route:
node scripts/router/vault-router.js --user $(user) --idea $(idea) --prompt $(prompt) --chatlog $(chatlog)

mask:
node scripts/agent/mask-prompts.js --file $(file) --prefix

diffuse-vault:
node scripts/diffuse-memory.js encode --user $(user) --file $(file)

decode-vault:
node scripts/diffuse-memory.js decode --file $(file)

audit-transmissions:
node scripts/admin/audit-transmissions.js

admin-decrypt:
node scripts/admin/admin-decrypt.js --session $(session) --key $(key)


rotate:
node scripts/vault/rotate-vault.js --user $(user) --reason "$(reason)"

expire:
node scripts/vault/expire-vault.js expire --user $(user)

recall:
node scripts/vault/expire-vault.js recall --ghost $(ghost)

animate:
node scripts/agent/vault-visualizer.js $(user)

vault-video:
node scripts/agent/vault-visualizer.js $(user)

export-video:
node scripts/agent/vault-visualizer.js $(user)

devkit:
node scripts/devkit/export-devkit.js $(user)

vault-template:
node scripts/fork-idea.js $(slug) $(user)

submit-agent:
node scripts/marketplace-preview.js

sync:
node scripts/vault/trace.js sync --input $(input) --output $(output)

seal:
node scripts/vault/trace.js seal --file $(file)

trace:
node scripts/vault/trace.js decode --file $(file)

dashboard:
NODE_ENV=production node scripts/server/boot-server.js

reflect-vault:
node kernel-cli.js reflect-vault --user $(user)

promote:
node kernel-cli.js promote-idea $(slug)

fork:
node scripts/fork-idea.js $(slug) $(user)

playback:
NODE_ENV=production node scripts/server/boot-server.js

remote:
NODE_ENV=production node scripts/server/boot-server.js

narrator:
node scripts/agent/glyph-agent.js speak $(user) $(message)

night-loop:
node scripts/cron/nightly-reflection.js $(user)

vault-ui:
NODE_ENV=production node scripts/server/boot-server.js

reflect-ui:
NODE_ENV=production node scripts/server/boot-server.js

curate:
node scripts/agent/vault-curator.js $(user)

reflect-nightly:
node scripts/cron/nightly-reflection.js $(user)

promote-auto:
node scripts/promote-idea.js $(slug) && node scripts/devkit/export-devkit.js $(user) && node scripts/agent/vault-visualizer.js $(user)

trust-router:
node scripts/router/vault-router.js --user $(user) --idea $(idea)

unlock-agent:
node scripts/vault-cli.js deposit $(user) $(amount)

# New runtime utilities
launch:
./launch-agent.sh

record:
node scripts/agent/voice-reflector.js record

play-last-voice:
node scripts/agent/voice-reflector.js play

whisper-idea:
node scripts/agent/voice-reflector.js whisper

mirror:
node scripts/agent/memory-mirror.js

unlock:
	node scripts/onboarding/devkit-unlock.js $(user)

pay:
node scripts/payments/stripe-hook.js pay

refer:
	node scripts/onboarding/referral.js $(referrer) $(new)

reflect:
	node scripts/onboarding/seed-idea.js $(user)

whisper:
node scripts/agent/voice-reflector.js whisper

remix:
node scripts/agent/memory-mirror.js

digest:
	node scripts/onboarding/daily-digest.js $(user)

set-theme:
	node scripts/onboarding/theme-manager.js set $(name) $(user)

buy-theme:
	node scripts/onboarding/theme-manager.js buy $(name) $(user)

devkit:
	node scripts/devkit/build-devkit.js $(user)
