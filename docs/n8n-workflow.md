# n8n Workflow — Webhook Migration Guide (Step 12)

This document describes how to replace manual project input in the existing Brieflane report workflow with a **Webhook** trigger from the Brieflane API.

**Contract reference:** [REQUIREMENTS_SPEC.md](./REQUIREMENTS_SPEC.md) §3

---

## Before you start

1. Brieflane `POST /api/projects/:id/generate-report` is implemented (Step 11).
2. Server env vars are set:
   - `N8N_REPORT_WEBHOOK_URL` — production webhook URL
   - `N8N_WEBHOOK_SECRET` — shared secret (sent as `X-Brieflane-Secret`)
3. Export your current workflow JSON for backup.

---

## 1. Add Webhook trigger

1. Open the report workflow in n8n.
2. **Disable or remove** the manual trigger / form fields for:
   - ActiveCollab project ID
   - Project name
   - Client email
   - CC recipients
3. Add a **Webhook** node as the trigger:
   - **HTTP Method:** `POST`
   - **Path:** choose a stable path (e.g. `brieflane-report`)
   - **Authentication:** none at webhook level — Brieflane sends `X-Brieflane-Secret` header; validate in a Function node or use n8n header auth if available
   - **Response:** `Immediately` (workflow runs async) or `When last node finishes` depending on your needs

Copy the **Production URL** into `N8N_REPORT_WEBHOOK_URL` on the Brieflane server.

---

## 2. Map webhook body to existing nodes

Brieflane sends this JSON body:

```json
{
  "reportRunId": "clx01abc123",
  "brieflaneProjectId": "clx01proj456",
  "acProjectId": 12345,
  "projectName": "Client ABC — Website Redesign",
  "clientEmail": "client@example.com",
  "reportRecipients": ["pm@company.com"],
  "customMetadata": {},
  "triggeredBy": "admin@company.com"
}
```

Replace manual inputs in downstream nodes with expressions:

| Former manual field | n8n expression |
|---------------------|----------------|
| AC project ID | `{{ $json.body.acProjectId }}` or `{{ $json.acProjectId }}` (depends on Webhook node output shape) |
| Project name | `{{ $json.body.projectName }}` |
| Primary email | `{{ $json.body.clientEmail }}` |
| CC list | `{{ $json.body.reportRecipients }}` |
| Notes / metadata | `{{ $json.body.customMetadata }}` |

> **Tip:** Run the Webhook node once with “Listen for test event”, trigger from Brieflane, then inspect the JSON shape in the execution panel.

---

## 3. Validate secret header

Add a **IF** or **Function** node after Webhook:

```
Header: X-Brieflane-Secret
Expected: same value as N8N_WEBHOOK_SECRET on Brieflane server
```

Reject requests that do not match (return 401 from a Respond to Webhook node if using synchronous response mode).

---

## 4. ActiveCollab nodes

Keep existing AC API nodes unchanged — they should already use the project ID expression updated in step 2.

Document which AC endpoints your workflow calls in [n8n-workflow-inventory.md](./n8n-workflow-inventory.md) (template below).

---

## 5. Test end-to-end

1. In Brieflane: open a project with **client email** set → **Generate report** → confirm.
2. In n8n: verify execution started with correct `acProjectId` and `clientEmail`.
3. Confirm client email still sends as before.
4. In Brieflane: check **Dashboard** and project **Report history** — run should show `running` or `failed`.

---

## 6. Optional callback (Step 17)

To mark runs `completed` / `failed` after the workflow finishes, add an HTTP Request node at the end:

- **URL:** `https://your-api.example.com/api/webhooks/n8n/report-status` (not implemented in v1)
- **Header:** `X-Brieflane-Secret`
- **Body:** `{ "reportRunId", "status", "n8nExecutionId", "errorMessage" }`

---

## Workflow inventory template

Fill in [n8n-workflow-inventory.md](./n8n-workflow-inventory.md) when exporting the workflow.

---

## Sign-off

- [ ] Manual trigger removed
- [ ] Webhook URL in production env
- [ ] Secret header validated
- [ ] Test report emailed successfully
- [ ] Brieflane report history shows the run
