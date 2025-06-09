# Kernel Summary

## How the kernel works
The kernel loads the following agents: OrchestrationAgent, SemanticEngine, BackupOrchestrator, ChatImporter, ChatLogParser, ClusterUtils, LinkSequential, ChatlogUtils, GenerateChatSummary, ChatlogParser, UploadServer, EnsureFileAndDir, GenerateRouteHash.
Common Makefile tasks: run, voice, voice-loop, report, boot, doctor, test, verify.

## Inputs and Outputs
Agents do not explicitly declare inputs/outputs in their YAML files.

## Major Agents Installed
- Analysis Bot: Performs static analysis on code and reports issues
- Chat Helper Agent: Provides summarization and response suggestions for chat logs
- Data Sync Agent: Synchronizes files with a remote server

## Getting Started for Developers
Install dependencies with `npm install` and use the Makefile tasks to run the kernel.
Run `make boot` to validate the environment and start the agent loop.
