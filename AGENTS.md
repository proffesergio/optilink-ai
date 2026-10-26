# OptiLink.ai Repository Guidelines

## Recovery-first workflow

- Read `.agentcontext/active_state.json` and `.agentcontext/CONTINUATION_PROMPT.md` before changing scope.
- Preserve dirty work. The root directory is not a usable Git checkout; the Next.js app has its own nested checkout in `frontend/.git`.
- Update `.agentcontext/active_state.json` after each completed phase with completed work, validation evidence, blockers, and the next phase options.
- Keep claims aligned with verified behavior. Mock dashboard data, unavailable Groq analysis, and unconfigured databases must remain labeled as such.

## Project areas

- `frontend/`: Next.js 16 App Router application. Read `frontend/AGENTS.md` and the relevant installed Next.js guide before editing. Run commands from this directory.
- `backend/`: FastAPI service. Use `backend/.venv/bin/python3` and `backend/.venv/bin/uvicorn` when available. Keep credentials in environment variables only.
- `extension/`: browser content-script bridge. Never collect or persist cookies, authorization headers, tokens, passwords, or other browser credentials.
- `.agentcontext/`: durable continuation state and phase handoffs. Do not put secrets in these files.

## Validation

For frontend changes, run `npm run lint` and then `npm run build` serially from `frontend/`. For backend changes, run `backend/.venv/bin/python3 -m compileall -q app` from `backend/` and import the FastAPI app. Database migrations and live Groq checks require explicit environment configuration and must be reported separately from local source validation.

## Product boundary

OptiLink suggestions are drafts for human review. Do not add automatic publishing, fabricated credentials, or a hard-coded admin account. Admin authentication is a future phase and must use a real identity/secret-management design.
