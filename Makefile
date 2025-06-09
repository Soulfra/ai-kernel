run:
	@node kernel-slate/scripts/features/build-timeline-dashboard.js && \
	node kernel-slate/scripts/core/semantic-engine.js &

voice:
        @node kernel-slate/scripts/features/record-voice-log.js

voice-loop:
        @node kernel-slate/scripts/features/voice-loop.js

report:
        @node kernel-slate/scripts/features/export-trace-report.js

boot:
	@node kernel-slate/scripts/core/cli-onboard.js
        @node kernel-slate/scripts/core/validate-environment.js
        @node kernel-slate/scripts/core/watch-agent-templates.js &
        @node kernel-slate/scripts/features/voice-loop.js &
        @node kernel-slate/scripts/core/agent-loop.js

clean:
        rm -rf logs tmp kernel-slate/logs kernel-slate/tmp \
               legacy/project_meta_external/logs legacy/project_meta_external/debug_logs \
               legacy/project_meta_external/task_logs
        find . -name agent.yaml -execdir rm -f README.md \;

prune:
        node scripts/dev/prune-kernel.js

doctor:
        kernel-cli verify

test:
	npm test

verify:
        @node scripts/core/ensure-runtime.js && echo "\xE2\x9C\x85 dependencies" || echo "\xE2\x9D\x8C dependencies"
        @node -e "const fs=require('fs');let a=[];if(fs.existsSync('installed-agents.json')){try{a=JSON.parse(fs.readFileSync('installed-agents.json','utf8'));}catch(e){}};process.exit(a.length?0:1)" && echo "\xE2\x9C\x85 agents installed" || echo "\xE2\x9D\x8C no agents installed"
        @if [ -f package.json ]; then echo "\xE2\x9C\x85 package.json"; else echo "\xE2\x9D\x8C package.json missing"; fi
        @if [ -f .env ]; then echo "\xE2\x9C\x85 .env"; else echo "\xE2\x9D\x8C .env missing"; fi
        @if [ -f kernel.json ]; then echo "\xE2\x9C\x85 kernel.json"; else echo "\xE2\x9D\x8C kernel.json missing"; fi
        @npm test --prefix kernel-slate && echo "\xE2\x9C\x85 tests" || echo "\xE2\x9D\x8C tests failed"

inspect:
	node scripts/dev/kernel-inspector.js
