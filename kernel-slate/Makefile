run:
	@node scripts/features/build-timeline-dashboard.js && \
		node scripts/core/semantic-engine.js &

voice:
	@node scripts/features/record-voice-log.js

voice-loop:
	@node scripts/features/voice-loop.js

report:
	@node scripts/features/export-trace-report.js

boot:
	@node scripts/core/cli-onboard.js
	@node scripts/core/validate-environment.js
	@node scripts/core/watch-agent-templates.js &
	@node scripts/features/voice-loop.js &
	@node scripts/core/agent-loop.js

clean:
	rm -rf logs tmp kernel-slate/logs kernel-slate/tmp \
		legacy/project_meta_external/logs legacy/project_meta_external/debug_logs \
		legacy/project_meta_external/task_logs
	find . -name agent.yaml -execdir rm -f README.md \;

legacy-archive:
	mkdir -p legacy/archived/project_meta_external
	mv legacy/docs legacy/features legacy/scripts legacy/archived/ 2>/dev/null || true
	mv legacy/project_meta_external/README.md legacy/project_meta_external/README_EXTERNAL.md \
		legacy/project_meta_external/plans legacy/project_meta_external/reports \
		legacy/project_meta_external/versioning legacy/project_meta_external/project_meta_external_filled_v2.zip \
		legacy/archived/project_meta_external/ 2>/dev/null || true

prune:
	node ../scripts/dev/prune-kernel.js
status:
	git status --short

doctor:
	kernel-cli doctor

test:
	npm test

verify:
	@node scripts/core/ensure-runtime.js && echo "\xE2\x9C\x85 dependencies" || echo "\xE2\x9D\x8C dependencies"
	@node -e "const fs=require('fs');let a=[];if(fs.existsSync('installed-agents.json')){try{a=JSON.parse(fs.readFileSync('installed-agents.json','utf8'));}catch(e){}};process.exit(a.length?0:1)" && echo "\xE2\x9C\x85 agents installed" || echo "\xE2\x9D\x8C no agents installed"
	@if [ -f package.json ]; then echo "\xE2\x9C\x85 package.json"; else echo "\xE2\x9D\x8C package.json missing"; fi
	@if [ -f .env ]; then echo "\xE2\x9C\x85 .env"; else echo "\xE2\x9D\x8C .env missing"; fi
	@if [ -f kernel.json ]; then echo "\xE2\x9C\x85 kernel.json"; else echo "\xE2\x9D\x8C kernel.json missing"; fi
	@npm test | tee logs/make-verify-output.log && echo "\xE2\x9C\x85 tests" || echo "\xE2\x9D\x8C tests failed"

inspect:
	node ../scripts/dev/kernel-inspector.js


standards:
	node scripts/agents/verify-kernel-standards.js ; node ../scripts/dev/log-standards-failures.js

release:
	node scripts/cli/kernel-cli.js release-check

release-check: release

export:
	zip -r kernel-release.zip . \
	            -x '*.git*' '*/node_modules/*' '*/logs/*' 'kernel-release.zip'

reprompt:
	node scripts/agents/kernel-feedback-loop.js --once

