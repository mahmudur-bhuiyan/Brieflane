# Brieflane — Implementation Status

**Last updated:** 2026-08-25  
**Tracks:** [PROJECT_PLAN.md](./PROJECT_PLAN.md)

---

## Progress summary

| Metric | Value |
|--------|-------|
| Core steps complete | **9 / 16** (~56%) |
| Partial | Step 10 (UX polish) |
| Next up | Steps 11–13 (Reports & n8n) |

---

## Step checklist

| Step | Name | Status | Notes |
|------|------|--------|-------|
| 1 | Requirements lock | ✅ Done | `REQUIREMENTS_SPEC.md` — n8n sign-off pending |
| 2 | Repo scaffold | ✅ Done | Uses `client/` + `server/` (not `apps/web` monorepo) |
| 3 | Neon + Prisma | ✅ Done | `server/prisma/`, `GET /api/health` |
| 4 | Authentication | ✅ Done | JWT, login, bootstrap admin |
| 5 | RBAC | ✅ Done | `requireRoles`, Users hidden from PM |
| 6 | User management | ✅ Done | CRUD + deactivate |
| 7 | ActiveCollab service | ✅ Done | `server/src/lib/activecollab/` |
| 8 | Project sync & CRUD | ✅ Done | Sync, list, detail UI |
| 9 | PM project assignments | ✅ Done | `project_assignments`, API + Users UI |
| 10 | Project UX polish | 🟡 Partial | Last synced, empty states; pre-report email validation pending (Step 11) |
| 11 | n8n webhook integration | ⬜ Not started | |
| 12 | Update n8n workflow | ⬜ Not started | `docs/n8n-workflow.md` missing |
| 13 | Report history UI | ⬜ Not started | |
| 14 | Security hardening | ⬜ Not started | No helmet / rate limits yet |
| 15 | Testing | ⬜ Not started | `docs/testing.md` missing |
| 16 | Deployment | ⬜ Not started | |

---

## Repo layout (actual)

```text
brieflane/
  client/          # React + Vite frontend
  server/          # Express API + Prisma
    prisma/        # Schema & migrations
  docs/
```

**Deviations from original plan:** no root monorepo `package.json`; Prisma lives under `server/`; client uses React Query and a theme toggle (not in original plan).

---

## API implemented (beyond original plan table)

| Method | Endpoint | Access |
|--------|----------|--------|
| GET | `/api/health` | public |
| GET | `/api/dashboard` | authenticated |
| GET | `/api/admin/ping` | Super Admin |
| GET | `/api/projects/ac-preview` | authenticated |
| GET | `/api/projects/ac-preview/:acProjectId` | authenticated |
| GET | `/api/users/:id/assignments` | Super Admin |
| PUT | `/api/users/:id/assignments` | Super Admin |

All endpoints from PROJECT_PLAN §5 for auth, users, and projects (except report routes) are implemented. PM list/detail routes filter by `project_assignments`.

---

## Definition of Done (v1 launch)

- [x] Super Admin can create Project Managers
- [x] Projects synced from ActiveCollab into Neon
- [x] Custom fields (client email, etc.) editable and saved
- [x] PM sees only assigned projects (Step 9)
- [ ] Generate Report triggers n8n without manual input
- [ ] Report history shows status and who triggered it
- [ ] Deployed to production with Neon
- [ ] Docs: setup guide + n8n workflow doc (contract exists in `REQUIREMENTS_SPEC.md`)

---

## Local development

```bash
# Terminal 1 — API
cd server
cp .env.example .env   # fill DATABASE_URL, JWT_SECRET, etc.
npm install
npm run db:migrate
npm run dev

# Terminal 2 — Web
cd client
cp .env.example .env
npm install
npm run dev
```

- API: `http://localhost:4000`
- Web: `http://localhost:5173`

---

## Pending documentation

| Document | Step | Status |
|----------|------|--------|
| `docs/n8n-workflow.md` | 12 | Not created |
| `docs/n8n-workflow-inventory.md` | 1 | Not created |
| `docs/testing.md` | 15 | Not created |
| Root `README.md` | 16 | Not created |

Update this file when completing each step.
