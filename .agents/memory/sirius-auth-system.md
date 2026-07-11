---
name: Sirius Auth System
description: Email/password account system for sirius-ai.live — route paths, build bundling, DB setup
---

## Auth Route Paths
Router is mounted at `/api` in app.ts (`app.use("/api", router)`).
Auth routes in `routes/auth.ts` must use `/auth/signup` and `/auth/login` (NOT `/api/auth/signup`) — the prefix is added by the mount.
Frontend calls `/api/auth/signup` — correct because that's the public-facing URL.

## bcryptjs Bundling
`bcryptjs` must be in the **allowlist** in `build.ts` (not alwaysExternal) so it gets bundled into index.cjs.
It's a pure-JS library; bundling it avoids needing to `npm install` on the server.

## Production DB Table
`sirius_accounts` table created on the production DB (siriusdb on 127.0.0.1):
```sql
CREATE TABLE IF NOT EXISTS sirius_accounts (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```
userId format: `acct_<id>` (e.g. `acct_1`).

## Garry Owner Bypass
Garry's userId is "garry" (not `acct_X`). isAuthenticated() in App.tsx allows both:
`userId.startsWith("acct_") || userId === "garry"`
His conversations are stored under userId="garry" — don't change this.

## isAuthenticated Check
In App.tsx, auth gate shows if userId not `acct_*` AND not "garry".
Existing users with `u_` prefix IDs will see the auth gate and must create an account.
