---
title: README_EXTERNAL
version: 1.0.0
description: Instructions for external/agency use of the project_meta directory copy.
lastUpdated: 2025-07-27T06:00:00Z
---

# External Project Meta (Agency Copy)

This directory is a **working copy** of the Clarity Engine `project_meta` folder, provided for external agency or contractor use.

## Purpose
- To allow agencies/contractors to fill out, update, or complete templates and plans **without modifying the main project files**.
- To ensure a clean, auditable migration of completed documents back into the main project.

## How to Use
1. **Work only in this directory.**
   - Do **not** edit the main `project_meta` folder in the project root.
2. **Complete all templates in `plans/` as needed.**
   - Fill out the JSON templates (e.g., `ENGINE_ONBOARDING_TEMPLATE.json`, `ENGINE_DB_SCHEMA_TEMPLATE.json`, `TASK_PLAN_TEMPLATE.json`).
   - Add new plan files as required.
3. **Update task logs and debug logs as appropriate.**
   - Use the structure and examples provided.
4. **Do not remove or rename files unless instructed.**
   - Add new files if needed, but keep the structure consistent.
5. **When finished, zip this entire directory and return it to the project owner.**
   - The project owner will review and migrate your changes into the main project.

## Notes
- This copy is for external use only. The main project will continue to evolve in parallel.
- If you have questions, contact the project owner before making structural changes.

---
*Last updated: 2025-07-27* 