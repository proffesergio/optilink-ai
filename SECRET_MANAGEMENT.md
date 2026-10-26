# OptiLink.ai secret management

Never commit `.env`, `.env.local`, Vercel OIDC files, database URLs, API keys, or passwords. The repository ignores these files. Never expose secret values in logs, screenshots, browser tests, or chat.

## Local Neon credentials

The linked Neon branch currently provides these local keys:

```text
NEON_BRANCH
DATABASE_URL
DATABASE_URL_UNPOOLED
NEON_AUTH_BASE_URL
NEON_AUTH_JWKS_URL
```

Refresh them from the project root without printing values:

```bash
neonctl env pull --file .env.local
```

Use `DATABASE_URL` only in the server/backend runtime. Do not add database URLs to the browser bundle or to the Vercel frontend project until a server-side backend route actually consumes them.

## GitHub Actions Vercel secrets

Create a short-lived Vercel token in your own terminal. The token is shown once; copy it directly into GitHub and do not paste it into this chat:

```bash
vercel tokens create optilink-ci
gh secret set VERCEL_TOKEN
gh secret set VERCEL_ORG_ID --body team_yf7iOHYHJYCOC2ffbYMTB9hC
gh secret set VERCEL_PROJECT_ID --body prj_O8AOHBmZUsTTKnl347h5l62A6n3q
gh secret list
```

Rotate the CI token with `vercel tokens create`, update `VERCEL_TOKEN`, then revoke the old token using `vercel tokens revoke <token-id>`. Do not put `VERCEL_TOKEN` in Vercel project environment variables.

## Runtime secrets

- `GROQ_API_KEY`: create and rotate it in the Groq provider dashboard; store it only on the FastAPI host.
- `REDIS_URL`: create it with the chosen Redis provider; store it only on the FastAPI host.
- `DATABASE_URL` and `DATABASE_URL_UNPOOLED`: use the Neon-managed values on the FastAPI host.
- `NEON_AUTH_BASE_URL` and `NEON_AUTH_JWKS_URL`: configure when the official Neon Auth SDK and protected routes are wired; do not invent replacement URLs.
- `NEXT_PUBLIC_API_BASE_URL`: this may be public, but set it only to the verified deployed backend URL. None is deployed yet.

## Admin credentials

Neon Auth is enabled, but the application dashboard is not protected by Neon Auth yet. Do not create a production admin user until the login route, session validation, authorization checks, and logout flow are deployed and tested. Use a real owner email and a password manager-generated password after that phase.

## Repair the current failed Vercel build

The pushed commit removed the legacy `frontend` gitlink without adding the frontend files. From a writable clone on `main`, restore the frontend tree as ordinary tracked files:

```bash
git rm --cached -r frontend 2>/dev/null || true
git add -f frontend/app frontend/components frontend/lib frontend/public \
  frontend/*.json frontend/*.md frontend/*.ts frontend/*.mjs frontend/.gitignore
git add .agentcontext .github .gitignore AGENTS.md FINAL_VERIFICATION.md SECRET_MANAGEMENT.md
git ls-files frontend/app/page.tsx
git commit -m "fix: restore frontend tree for Vercel CI"
git push origin main
```

The `git ls-files` command must print `frontend/app/page.tsx` before pushing. The next `main` push should then use Vercel's configured `frontend` root directory.
