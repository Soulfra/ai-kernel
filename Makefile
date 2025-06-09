export-slim:
	zip -r ai-kernel-slim.zip scripts docs agent.yaml Makefile package.json kernel-slate/scripts/cli/kernel-cli.js \
	    -x 'legacy/*' 'logs/*' '.git/*' 'node_modules/*' '*test*' '*backup*'
