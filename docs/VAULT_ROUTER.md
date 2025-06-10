# Vault Router

The provider router selects OpenAI or Anthropic based on available keys. API keys are loaded from `.env` or `.kernelkeys` but never committed. Calls are logged in `vault/<id>/usage.json`. When no BYOK keys are present the system falls back to hosted keys and logs the provider in `logs/provider-activity.json`.
