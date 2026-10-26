# OptiLink.ai final verification handoff

This is the owner-run release checklist. The current repository has no implemented admin login, so do not treat the dashboard as authenticated or create a real production account until the authentication phase is complete.

## Local checks

Frontend:

```bash
cd frontend
npm ci
npm run lint
npm run build
```

Backend:

```bash
cd backend
source .venv/bin/activate
python3 -m compileall -q app
python3 -c 'from app.main import app; print(app.title, app.version)'
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Then open the frontend and use Profile lab. Without `GROQ_API_KEY`, the expected result is a clear `AI_NOT_CONFIGURED`/unavailable state. Do not claim live analysis until a configured key and a successful request are recorded.

## Required environment before release

Copy `backend/.env.example` to a private environment file and set production values for `DATABASE_URL`, `REDIS_URL`, `GROQ_API_KEY`, `FRONTEND_ORIGINS`, and `TRUSTED_HOSTS`. Run `backend/sql/001_initial_schema.sql` against the intended PostgreSQL/Supabase project only after reviewing the target database. Never commit `.env` files or print secrets.

## Admin credentials gate

Admin authentication is not implemented in this phase. Before creating credentials, Phase 5 must add an authenticated route, password hashing or an approved identity provider, session expiry, recovery, and authorization tests. After that phase, generate a unique owner email and a random password with a password manager or:

```bash
openssl rand -base64 32
```

Store the resulting secret only in the deployment secret manager, verify login and logout in a private browser session, and rotate it after the first successful deployment. Never put credentials in source, `.agentcontext`, screenshots, or test fixtures.
