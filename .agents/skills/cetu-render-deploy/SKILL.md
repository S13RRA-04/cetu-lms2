---
name: cetu-render-deploy
description: Use when checking what's actually live in production for cetu-lms (LMS/PACT/LAIR/KCR), triggering a Render deploy, or querying/updating the live Postgres database directly. Triggers - "is this deployed", "what does prod use", "deploy the frontend changes", "check the live DB", "which database is live", "superadmin", "role check", questions about Render env vars or DATABASE_URL.
metadata:
  author: local
  version: "0.1.0"
---

# cetu-lms Render deploy & live-DB verification

## The one thing to never forget

**`backend/.env` (and root `.env`) are not reliable sources of truth for what's
live.** They drift from reality — values get pasted in during troubleshooting
and never cleaned up. There is exactly one `DATABASE_URL` that matters: the one
configured on the Render service. Always verify against the Render API before
assuming a connection string, a deployed commit, or an env var value.

## Service identity

- Render service: `cetu-lms`, id `srv-d8b0356l51nc7397c79g`
- `RENDER_API_KEY` lives in `backend/.env`
- Single Docker image builds and serves **all four** frontends
  (`frontend` → LMS, `pact-app`, `lair-app`, `kcr-app`) plus the Express API —
  see root `Dockerfile`. There is no separate deploy step per app; one image,
  one Render service, one deploy.

## Check what's actually live

```bash
curl -s -H "Authorization: Bearer $RENDER_API_KEY" \
  "https://api.render.com/v1/services/srv-d8b0356l51nc7397c79g/env-vars"
```

Pull `DATABASE_URL` out of that response — that's the real live DB connection
string, independent of whatever `backend/.env` currently says.

To see recent/current deploys:

```bash
curl -s -H "Authorization: Bearer $RENDER_API_KEY" \
  "https://api.render.com/v1/services/srv-d8b0356l51nc7397c79g/deploys?limit=5"
```

## Trigger a deploy

Pushing to the branch Render watches triggers a build automatically. To force
one without a new commit (e.g. after only changing a Render env var):

```bash
curl -s -X POST -H "Authorization: Bearer $RENDER_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.render.com/v1/services/srv-d8b0356l51nc7397c79g/deploys"
```

Confirm success via `GET /api/v1/health` on the deployed URL, then a real
round-trip (e.g. `/api/v1/auth/login`) — don't just trust "deploy succeeded" in
the Render dashboard.

## Live database is Supabase, not Neon

As of 2026-07-20 the app's live Postgres is a **Supabase** project
(`prpatclclduhjzqrxrmi`, reached via the **session pooler**, not the direct
`db.<ref>.supabase.co` host — that host doesn't resolve over IPv4-only
environments). Connection string lives in `backend/.env` as
`PACT_SUPABASE_SESSION_POOL`, and matches whatever the Render API shows for
`DATABASE_URL` — confirm they still match before trusting either.

Old `DATABASE_URL`-shaped Neon strings in `.env` (`ep-calm-violet-*`,
`NEON_PACT_DB`) are **not** live — see
[[project_neon_quota_and_supabase_migration]] for the full history of why.

The Supabase MCP tools (`mcp__supabase__*`) available in this environment are
scoped to a **different** project — the standalone LAIR-only Supabase
(`umgiwanswitpmadlmdaq`), confirmed via `get_project_url`. They will NOT show
you PACT/LMS live data. For direct queries against the actual live DB, use a
throwaway Node script with the `pg` package and
`PACT_SUPABASE_SESSION_POOL` as the connection string (run it from inside
`backend/` so `node_modules` resolves), e.g.:

```js
const { Client } = require('pg');
const client = new Client({
  connectionString: process.env.PACT_SUPABASE_SESSION_POOL,
  ssl: { rejectUnauthorized: false },
});
```

Always `SELECT` before `UPDATE` to confirm current state, since local `.env`
can be stale.

## Known standing issue

The LAIR Supabase project (`umgiwanswitpmadlmdaq`) has **Row Level Security
disabled on every table**, including `users` — fully exposed to the anon key.
This was surfaced by `mcp__supabase__list_tables`'s advisory output. Do not
silently "fix" this by enabling RLS (it will lock out all access without
policies) — flag it to the user and let them decide on policies.
