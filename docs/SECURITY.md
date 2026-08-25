# Brieflane — Security Checklist (Step 14)

**Last updated:** 2026-08-25

---

## HTTP hardening

| Control | Status | Notes |
|---------|--------|-------|
| Helmet response headers | ✅ | `server/src/middleware/security.ts` |
| CORS locked to `WEB_ORIGIN` | ✅ | Explicit methods + headers |
| JSON body size limit | ✅ | 1 MB via `express.json({ limit: '1mb' })` |
| `X-Powered-By` disabled | ✅ | `app.disable('x-powered-by')` |

## Rate limiting

| Endpoint | Limit | Window |
|----------|-------|--------|
| `POST /api/auth/login` | 10 requests | 15 minutes / IP |
| `POST /api/projects/:id/generate-report` | 20 requests | 1 hour / IP |

Configured in `server/src/middleware/rate-limit.ts`.

## Authentication & RBAC

| Check | Status |
|-------|--------|
| JWT required on protected routes | ✅ |
| Super Admin only: users CRUD, assignments, archive | ✅ |
| PM project list filtered by assignments | ✅ |
| Project detail / update / generate-report access check | ✅ |
| Report runs filtered by project access | ✅ |

## Secrets

| Check | Status |
|-------|--------|
| AC token, n8n URL/secret, JWT only in server `.env` | ✅ |
| Client bundle: only `VITE_API_URL` (optional) | ✅ |
| No API tokens in server logs | ✅ |

## Input validation

| Area | Status |
|------|--------|
| Auth, users, projects via Zod schemas | ✅ |
| Report trigger validates client email server-side | ✅ |

## Production reminders

- Set strong `JWT_SECRET` and rotate if compromised
- Use HTTPS on API and web (Vercel/Railway terminate TLS)
- Restrict `WEB_ORIGIN` to production domain only
- Do not commit `.env` files
- Review n8n webhook secret periodically

---

See also: [REQUIREMENTS_SPEC.md](./REQUIREMENTS_SPEC.md), [PROJECT_PLAN.md](./PROJECT_PLAN.md) § Step 14.
