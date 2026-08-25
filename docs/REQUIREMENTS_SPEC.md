# Brieflane — Requirements Spec (Step 1)

**Status:** Draft for n8n team review  
**Date:** 2026-08-25  
**Goal:** Replace manual project input in the existing n8n report workflow with a webhook triggered from Brieflane.

---

## 1. Current n8n Workflow — Manual Inputs

These are the fields currently entered by hand when running the report workflow. Brieflane must supply equivalent values via webhook.

| Manual input (n8n) | Type | Required | Brieflane source | Webhook field |
|--------------------|------|----------|------------------|---------------|
| ActiveCollab project ID | integer | yes | `projects.ac_project_id` | `acProjectId` |
| Project name | string | yes | `projects.name` | `projectName` |
| Client email (primary recipient) | email | yes | `projects.client_email` | `clientEmail` |
| CC / extra recipients | email[] | no | `projects.report_recipients` | `reportRecipients` |
| Custom notes / metadata | object | no | `projects.custom_metadata` | `customMetadata` |

**Brieflane-only fields** (for audit; n8n may ignore or log):

| Field | Type | Source |
|-------|------|--------|
| `brieflaneProjectId` | string (cuid) | `projects.id` |
| `reportRunId` | string (cuid) | `report_runs.id` — created before webhook call |
| `triggeredBy` | string (email) | authenticated user email |

---

## 2. ActiveCollab API Endpoints

### Brieflane API (sync & preview)

Used by the Express API only — never exposed to the browser.

| Purpose | Method | Endpoint | Notes |
|---------|--------|----------|-------|
| List projects for sync UI | GET | `/api/v1/projects` | Paginate; upsert by `ac_project_id` |
| Single project detail | GET | `/api/v1/projects/{id}` | Optional; for refresh after sync |
| Auth | — | `X-Angie-AuthApiToken` header | Token from `ACTIVECOLLAB_API_TOKEN` env |

Base URL: `ACTIVECOLLAB_BASE_URL` (e.g. `https://yourcompany.activecollab.com`).

### n8n workflow (existing — confirm with workflow owner)

Document the exact nodes/endpoints your workflow calls today. Typical report flows use:

| Likely use in workflow | Method | Endpoint |
|------------------------|--------|----------|
| Project metadata | GET | `/api/v1/projects/{id}` |
| Tasks / time / activity | GET | `/api/v1/projects/{id}/tasks`, `/api/v1/projects/{id}/time-records` (or equivalent) |

> **Action:** n8n owner fills in the “Actual endpoint” column in `docs/n8n-workflow-inventory.md` (create when exporting workflow) so Brieflane does not duplicate AC fetches unnecessarily.

---

## 3. Webhook Contract — Brieflane → n8n

**URL:** `N8N_REPORT_WEBHOOK_URL` (env, server-side only)  
**Method:** `POST`  
**Content-Type:** `application/json`  
**Auth:** Header `X-Brieflane-Secret: <N8N_WEBHOOK_SECRET>`

### Request body

```json
{
  "reportRunId": "clx01abc123",
  "brieflaneProjectId": "clx01proj456",
  "acProjectId": 12345,
  "projectName": "Client ABC — Website Redesign",
  "clientEmail": "client@example.com",
  "reportRecipients": ["pm@company.com", "accounting@company.com"],
  "customMetadata": {
    "billingPeriod": "2026-07",
    "notes": "Include milestone summary"
  },
  "triggeredBy": "admin@company.com"
}
```

### Field rules

| Field | Required | Validation |
|-------|----------|------------|
| `acProjectId` | yes | positive integer; must match AC |
| `projectName` | yes | non-empty string |
| `clientEmail` | yes | valid email; Brieflane blocks trigger if missing |
| `reportRecipients` | no | array of valid emails; default `[]` |
| `customMetadata` | no | JSON object; default `{}` |
| `brieflaneProjectId` | yes | internal id for logging |
| `reportRunId` | yes | id for optional callback (Step 17) |
| `triggeredBy` | yes | email of user who clicked Generate |

### n8n mapping (Step 12)

Replace manual trigger fields with expressions, e.g.:

- `{{ $json.acProjectId }}` → existing AC “project id” node input  
- `{{ $json.projectName }}` → display / email subject  
- `{{ $json.clientEmail }}` → primary Send Email “To”  
- `{{ $json.reportRecipients }}` → CC/BCC loop or joined string  

### Success / error (synchronous HTTP)

| HTTP status | Meaning | Brieflane action |
|-------------|---------|------------------|
| 2xx | Webhook accepted | Set `report_run.status` → `running` (or `completed` if workflow is fast) |
| 4xx / 5xx / timeout | n8n rejected or unreachable | Set `report_run.status` → `failed`, store `error_message` |

---

## 4. Webhook Contract — n8n → Brieflane (optional v1.1)

**URL:** `POST /api/webhooks/n8n/report-status`  
**Auth:** Same `X-Brieflane-Secret` header  

```json
{
  "reportRunId": "clx01abc123",
  "status": "completed",
  "n8nExecutionId": "12345",
  "errorMessage": null
}
```

`status`: `completed` | `failed`

---

## 5. PM Scope Decision

| Role | Project access (v1) |
|------|---------------------|
| **Super Admin** | All projects |
| **Project Manager** | **Assigned projects only** |

**Rationale:** Matches plan risk mitigation (“PM sees all projects”); `project_assignments` table in Step 9. Super Admin assigns PMs before go-live.

**Status (2026-08-25):** Step 9 implemented — `project_assignments` table, `PUT /api/users/:id/assignments`, PM project list filtered by assignment.

---

## 6. Sign-off Checklist

- [ ] n8n owner confirms manual inputs table matches current workflow  
- [ ] n8n owner confirms webhook JSON replaces all manual fields  
- [ ] AC endpoints used by n8n documented (section 2)  
- [ ] `X-Brieflane-Secret` header name agreed  
- [ ] PM assigned-only scope accepted for production  

**Acceptance:** n8n team agrees this payload replaces manual fields; no code changes required in Brieflane contract after sign-off.

---

## References

- Full plan: [PROJECT_PLAN.md](./PROJECT_PLAN.md)
- Implementation progress: [IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md)
