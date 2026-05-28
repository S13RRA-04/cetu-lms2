# Neon PostgreSQL Setup

This backend already supports Neon through `DATABASE_URL`. Local Docker development can keep using the existing `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD` values.

## 1. Create the Neon database

1. Create a Neon project.
2. Create or select the database for this app, for example `cetu_lms`.
3. Copy the connection string from the Neon dashboard.
4. Make sure the string includes `sslmode=require`.

Use separate Neon projects or branches for staging and production. Do not reuse a production connection string in local or staging environments.

## 2. Choose the connection string

Use a direct connection string for migrations and one-off maintenance commands:

```text
postgresql://USER:PASSWORD@ep-example.us-east-1.aws.neon.tech/cetu_lms?sslmode=require
```

Use a pooled connection string for long-running deployed app instances when connection count is a concern. Neon pooled hostnames include `-pooler`:

```text
postgresql://USER:PASSWORD@ep-example-pooler.us-east-1.aws.neon.tech/cetu_lms?sslmode=require
```

For this Sequelize app, prefer the direct connection for `sequelize-cli db:migrate`. If a deployment platform only allows one `DATABASE_URL`, start with the direct Neon connection string and switch runtime services to pooled only after migrations are handled separately.

## 3. Configure the backend

For local testing against Neon, set `DATABASE_URL` in `backend/.env`:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST/cetu_lms?sslmode=require
```

For Render, set `DATABASE_URL` manually in the service environment. `render.yaml` already declares it with `sync: false` so the secret is not committed.

Required production values still include:

```env
NODE_ENV=production
JWT_SECRET=<64-char random hex>
LTI_KEY=<exactly 32 characters>
FRONTEND_URL=<public frontend origin>
```

## 4. Run migrations

From the backend directory:

```powershell
npm install
npm run db:migrate
```

Seed the initial superadmin only when intended:

```powershell
npm run db:seed
```

The app startup also runs migrations in the root Dockerfile before `node src/server.js`, so make sure the deployed `DATABASE_URL` user has permission to create tables, indexes, enum types, and the `pgcrypto` extension.

## 5. Verify the connection

From the backend directory:

```powershell
node -e "require('dotenv').config(); const { sequelize } = require('./src/config/database'); sequelize.authenticate().then(() => { console.log('Neon connection OK'); return sequelize.close(); }).catch((err) => { console.error(err); process.exit(1); });"
```

Then start the API and check health:

```powershell
npm start
```

```powershell
Invoke-WebRequest http://localhost:3001/api/v1/health
```

## Security notes

- Do not commit `.env` files or Neon connection strings.
- Keep staging and production Neon projects, branches, or databases separate.
- Use least-privilege database roles where possible.
- Rotate the Neon password if it was pasted into logs, tickets, screenshots, or chat.
- Frontend Vite environment variables are public and must never contain `DATABASE_URL`.
