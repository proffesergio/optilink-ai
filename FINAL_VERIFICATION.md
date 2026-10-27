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

## Neon verification and required environment

The authorized Neon project is linked locally to the `production` branch. The reviewed migration was applied and verified with `neonctl psql`; do not rerun it against a different branch without review.

When the Neon API is reachable, refresh branch variables from the project root:

```bash
neon env pull --service postgres --service auth
```

Keep the resulting `.env`/`.env.local` private. The current FastAPI service already reads `DATABASE_URL` and `REDIS_URL`; Neon Auth still needs its official frontend SDK and authenticated route boundary before the dashboard can be considered protected.

Current Neon status: PostgreSQL and Neon Auth verified; Object Storage/AI Gateway preview configuration is present; Functions and Realtime are not yet exposed as wired application services. Do not claim those services are end-to-end integrated.

## Vercel production and main-branch CI/CD

The Vercel project is `optilink`, with project ID `prj_O8AOHBmZUsTTKnl347h5l62A6n3q`, root directory `frontend`, and current aliases `optilink-nine.vercel.app` and `optilinkai.vercel.app`. `optilink.vercel.app` is already in use by another Vercel account and cannot be assigned here.

The repository includes `.github/workflows/vercel-deploy.yml`. To enable automatic production deployment on pushes to `main`, add these GitHub Actions secrets in `proffesergio/optilink-ai`:

```text
VERCEL_TOKEN       # create privately in Vercel account settings
VERCEL_ORG_ID      # team_yf7iOHYHJYCOC2ffbYMTB9hC
VERCEL_PROJECT_ID  # prj_O8AOHBmZUsTTKnl347h5l62A6n3q
```

The owner has now connected the GitHub repository in Vercel. Verify the first `main` deployment after the repository push. The current deployment still redirects unauthenticated visitors through Vercel Authentication; disable Deployment Protection in Vercel project settings only if this showcase is intended to be public. Never commit the token or any `.env.local` file.

See [SECRET_MANAGEMENT.md](SECRET_MANAGEMENT.md) for the exact token-generation, GitHub secret, rotation, and failed-build repair procedure.

## FastAPI backend deployment boundary

The backend now has Vercel metadata in `backend/pyproject.toml` with the
`app.main:app` entrypoint, pooled Neon connection defaults, and a real
PostgreSQL readiness probe. Deploy it as a separate Vercel project with Root
Directory `backend`; keep the existing `optilink` project rooted at
`frontend`. Configure the pooled `DATABASE_URL` only in the backend project,
then set the frontend's public `NEXT_PUBLIC_API_BASE_URL` to the verified API
origin. The extension WebSocket and Redis-backed long-running work should use
a separate long-lived runtime until their production lifecycle is verified.

## Required environment before release

Copy `backend/.env.example` to a private environment file and set production values for `DATABASE_URL`, `REDIS_URL`, `GROQ_API_KEY`, `FRONTEND_ORIGINS`, and `TRUSTED_HOSTS`. The current Neon database migration is complete; verify the target branch before any repeat. Never commit `.env` files or print secrets.

## Admin credentials gate

Admin authentication is not implemented in this phase. Before creating credentials, Phase 5 must add an authenticated route, password hashing or an approved identity provider, session expiry, recovery, and authorization tests. After that phase, generate a unique owner email and a random password with a password manager or:

```bash
openssl rand -base64 32
```

Store the resulting secret only in the deployment secret manager, verify login and logout in a private browser session, and rotate it after the first successful deployment. Never put credentials in source, `.agentcontext`, screenshots, or test fixtures.
