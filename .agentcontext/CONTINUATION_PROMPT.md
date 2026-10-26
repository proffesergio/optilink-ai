# OptiLink.ai continuous development handoff

Use this prompt after a crash, context compaction, or usage limit:

> Resume OptiLink.ai from the durable state. First read `AGENTS.md`, `.agentcontext/active_state.json`, and this file. Inspect the existing dirty work and current test artifacts before editing. Preserve completed phases and do not reset or overwrite user changes. Continue only from `current_phase`/`next`, verify the stated acceptance criteria, update the state file, and leave the next phase options for the next run. Keep product claims truthful: implemented behavior, local mocks, external-service blockers, and deployment status must be separated.

## Phase completion protocol

At the end of every phase:

1. Record the implementation, files changed, and exact local validation commands in `active_state.json`.
2. Record any missing credentials, external services, or browser permissions as blockers rather than silently skipping them.
3. Keep one recommended next phase and two bounded alternatives:
   - continue the main product phase;
   - harden tests/accessibility/security;
   - prepare infrastructure/deployment after required MCP tools and credentials are available.
4. Ask the owner to enable only the MCP servers or skills needed for the selected next phase. Do not install or expose credentials automatically.

## Current continuation options

- Recommended: Phase 5 — authentication, admin access, and persistence for the review queue.
- Quality gate: add browser E2E coverage, accessibility checks, and API contract tests for Profile Lab.
- Infrastructure: configure PostgreSQL/Redis/Groq and run migration plus live-service preflight.

The current Profile Lab is deliberately a human-review surface. It does not save profile data, publish edits, or implement admin login yet.
