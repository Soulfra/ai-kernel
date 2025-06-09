#!/bin/bash
node ../core/validate-environment.js
for f in ../../agent-templates/*.yaml; do
  [ -f "$f" ] && node ../market/install-agent.js "$f"
done
node ../core/agent-loop.js
