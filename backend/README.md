# OptiLink.ai API

FastAPI HTTP API backed by Neon PostgreSQL. The runtime uses the pooled
`DATABASE_URL` for request traffic. Use `DATABASE_URL_UNPOOLED` only for
migrations and administrative SQL.

## Local verification

From the repository root:

```bash
backend/.venv/bin/python -m compileall -q backend/app
(cd backend && .venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000)
curl http://127.0.0.1:8000/api/v1/health
curl http://127.0.0.1:8000/api/v1/ready
```

Do not paste the value of `DATABASE_URL` into shell history or chat. Load it
from a private environment file instead.

## Vercel deployment shape

Deploy this directory as a separate Vercel project, for example
`optilink-api`, with the Vercel Root Directory set to `backend`. Vercel detects
the FastAPI application using `pyproject.toml` and the `app.main:app`
entrypoint. Add `DATABASE_URL` as a server-side Production environment
variable, using Neon's pooled URL. Add `GROQ_API_KEY`, `REDIS_URL`,
`FRONTEND_ORIGINS`, and `TRUSTED_HOSTS` only when those services are deployed
and verified.

From `backend/` after linking the separate project:

```bash
vercel link
vercel env add DATABASE_URL production
vercel env add FRONTEND_ORIGINS production
vercel env add TRUSTED_HOSTS production
vercel --prod
```

### Important CLI working directory rule

For the Git-connected `optilink-api` project, Vercel Root Directory is
`backend`. A manual CLI deployment must therefore start from the repository
root, not from `backend/`; otherwise Vercel searches for `backend/backend` and
rejects the deployment.

```bash
cd /path/to/optilink-root
vercel link --project optilink-api --scope team_yf7iOHYHJYCOC2ffbYMTB9hC --yes
vercel --prod --scope team_yf7iOHYHJYCOC2ffbYMTB9hC
```

The Next.js project should then receive only the public API origin through
`NEXT_PUBLIC_API_BASE_URL`, for example
`https://optilink-api.vercel.app/api/v1`.

## Vercel troubleshooting

In the `optilink-api` Vercel project, verify Settings → Build and Deployment →
Root Directory is `backend`. From a linked checkout, inspect names without
printing values:

```bash
vercel env ls
vercel logs runtime --environment production --since 1h --json
```

The production project needs `DATABASE_URL` (the pooled Neon URL). Do not set
`DATABASE_URL` to the frontend project, and do not set `DATABASE_URL_UNPOOLED`
as the request-runtime URL. If Redis is not deployed yet, remove `REDIS_URL`
from this project rather than supplying a placeholder; the API will report
Redis as `not_configured` and remain usable for the HTTP MVP.

The current scraper WebSocket is not treated as a Vercel release dependency.
Keep it on a long-lived container/runtime or a dedicated realtime service
until its connection lifecycle and reconnect behavior are proven there.

## Database boundary

The schema in `sql/001_initial_schema.sql` is already applied to the Neon
production branch. Profile, lead, and metric writes remain behind the pending
Neon Auth/session boundary; do not expose user-id-based write routes before
authorization is implemented.
