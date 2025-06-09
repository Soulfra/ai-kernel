run:
	@node kernel-slate/scripts/features/build-timeline-dashboard.js && \
	node kernel-slate/scripts/core/semantic-engine.js &

voice:
	@node kernel-slate/scripts/features/record-voice-log.js

report:
        @node kernel-slate/scripts/features/export-trace-report.js

boot:
        @node kernel-slate/scripts/core/validate-environment.js
        @node kernel-slate/scripts/core/watch-agent-templates.js &
        @node kernel-slate/scripts/core/agent-loop.js
