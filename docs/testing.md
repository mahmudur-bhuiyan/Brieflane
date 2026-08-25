# Brieflane — Testing Guide (Step 15)

**Last updated:** 2026-08-25

---

## Automated tests (API)

Tests live in `server/src/**/*.test.ts` and run with Vitest + Supertest (mocked Prisma, ActiveCollab, and n8n).

```bash
cd server
npm test              # single run (CI)
npm run test:watch    # watch mode
```

### Coverage

| Area | Test file | What it checks |
|------|-----------|----------------|
| Password + JWT | `src/lib/auth.test.ts` | hash, verify, sign, verify token |
| RBAC filters | `src/lib/access.test.ts` | PM vs Super Admin query filters |
| n8n payload | `src/lib/reports.test.ts` | webhook JSON mapping |
| HTTP API | `src/app.api.test.ts` | login, RBAC, AC sync, generate-report |

---

## Manual E2E script

Run after local setup (`server` + `client` dev servers, database migrated).

### 1. Login

1. Open `http://localhost:5173`
2. Log in as bootstrap Super Admin (`BOOTSTRAP_ADMIN_EMAIL` / password from `.env`)
3. Confirm redirect to Dashboard

### 2. Users (Super Admin)

1. Go to **Users**
2. Create a Project Manager user
3. Save — user appears in list

### 3. Projects

1. Go to **Projects**
2. Click **Sync from ActiveCollab** (requires valid AC env vars)
3. Open a project → set **Client email**
4. Save changes

### 4. PM assignments (Super Admin)

1. On **Users**, assign the PM to at least one project

### 5. Generate report

1. On project detail, click **Generate report**
2. Confirm modal → **Confirm & send**
3. Expect success message (requires `N8N_REPORT_WEBHOOK_URL` + secret)

### 6. Report history

1. Dashboard → **Report activity** cards update
2. Project detail → **Report history** shows the run (status, user, errors if any)

### 7. PM scope

1. Log out → log in as PM
2. **Projects** shows only assigned projects
3. **Users** page not in nav / returns 403 if accessed directly

### 8. Security smoke

1. `POST /api/auth/login` with wrong password → 401
2. `GET /api/users` without token → 401

---

## CI

GitHub Actions workflow `.github/workflows/ci.yml` runs `npm test` in `server/` on push and pull request.

---

## Troubleshooting

| Issue | Check |
|-------|--------|
| Sync fails | `ACTIVECOLLAB_BASE_URL`, `ACTIVECOLLAB_API_TOKEN` |
| Report trigger 503 | `N8N_REPORT_WEBHOOK_URL`, `N8N_WEBHOOK_SECRET` |
| Report trigger 400 | Client email on project |
| PM sees no projects | Super Admin must assign projects |
