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

.PHONY: launch serve voice unlock refer reflect digest promote animate devkit set-theme
