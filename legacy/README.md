# Legacy Directory

The following directories were moved to `legacy/archived/` because they are no longer referenced by the active kernel or tests:

- `docs`
- `features`
- `scripts`
- `project_meta_external/README*`, `project_meta_external/plans`, `project_meta_external/reports`, `project_meta_external/versioning`, and `project_meta_external/project_meta_external_filled_v2.zip`

Only the log directories under `project_meta_external` remain (`logs`, `debug_logs`, `task_logs`) since they may be useful for debugging historical runs.

Run `make legacy-archive` to repeat this process.
