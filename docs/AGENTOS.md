# AGENTOS

The AgentOS layer controls device pairing, QR authentication and token gating. New tools such as the Claude voice agent and enrichment daemon respect these rules automatically.

Use `make generate-qr` to create a pairing code and `make check-pairing id=<id>` to verify a device.
