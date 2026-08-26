import type { TaskHoursEmailReport } from '../types/taskHoursReport';
import { formatReportHours, getSignatureDetail } from './taskHoursReport';

export const EMAIL_TEMPLATE_PLACEHOLDERS = [
  { key: '{{email.subject}}', description: 'Email subject line' },
  { key: '{{email.title}}', description: 'Header title in the email body' },
  { key: '{{email.subtitle}}', description: 'Header subtitle' },
  { key: '{{period.startDate}}', description: 'Report period start date' },
  { key: '{{period.endDate}}', description: 'Report period end date' },
  { key: '{{summary.totalBillableHours}}', description: 'Total billable hours' },
  { key: '{{billableHoursBreakdownTable}}', description: 'Billable hours by category table' },
  { key: '{{taskBreakdownTable}}', description: 'Task-level breakdown table' },
  { key: '{{signature.name}}', description: 'Sender name' },
  { key: '{{signature.email}}', description: 'Sender designation (if set) or email' },
] as const;

const TABLE_HEADER_STYLE =
  'background:#1a1d2e;color:#ffffff;padding:10px 16px;text-align:left;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;';
const TABLE_CELL_STYLE = 'padding:12px 16px;border-top:1px solid #e2e8f0;color:#334155;font-size:14px;';
const TABLE_FOOTER_STYLE =
  'padding:12px 16px;border-top:1px solid #e2e8f0;background:#f8fafc;font-weight:600;color:#0f172a;font-size:14px;';

function renderBillableHoursBreakdownTable(report: TaskHoursEmailReport): string {
  const breakdownTotal = report.billableHoursBreakdown.reduce((sum, row) => sum + row.hours, 0);

  const rows = report.billableHoursBreakdown
    .map(
      (row) => `
        <tr>
          <td style="${TABLE_CELL_STYLE}">${escapeHtml(row.category)}</td>
          <td style="${TABLE_CELL_STYLE};text-align:right;font-variant-numeric:tabular-nums;">${formatReportHours(row.hours)}</td>
        </tr>`,
    )
    .join('');

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
      <thead>
        <tr>
          <th style="${TABLE_HEADER_STYLE}">Category</th>
          <th style="${TABLE_HEADER_STYLE};text-align:right;">Hours</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
      <tfoot>
        <tr>
          <td style="${TABLE_FOOTER_STYLE}">Total</td>
          <td style="${TABLE_FOOTER_STYLE};text-align:right;font-variant-numeric:tabular-nums;">${formatReportHours(breakdownTotal)}</td>
        </tr>
      </tfoot>
    </table>`;
}

function renderTaskBreakdownTable(report: TaskHoursEmailReport): string {
  const statusStyle = (status: string) =>
    status === 'Billable'
      ? 'display:inline-block;padding:2px 8px;border-radius:9999px;background:#dcfce7;color:#166534;font-size:12px;font-weight:500;'
      : 'display:inline-block;padding:2px 8px;border-radius:9999px;background:#f1f5f9;color:#475569;font-size:12px;font-weight:500;';

  const rows = report.taskBreakdown
    .map(
      (row) => `
        <tr>
          <td style="${TABLE_CELL_STYLE};font-weight:500;color:#0f172a;">${escapeHtml(row.userName)}</td>
          <td style="${TABLE_CELL_STYLE}">${escapeHtml(row.category)}</td>
          <td style="${TABLE_CELL_STYLE}">${escapeHtml(row.taskDescription)}</td>
          <td style="${TABLE_CELL_STYLE};text-align:right;font-variant-numeric:tabular-nums;">${formatReportHours(row.hours)}</td>
          <td style="${TABLE_CELL_STYLE}"><span style="${statusStyle(row.status)}">${escapeHtml(row.status)}</span></td>
        </tr>`,
    )
    .join('');

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
      <thead>
        <tr>
          <th style="${TABLE_HEADER_STYLE}">User</th>
          <th style="${TABLE_HEADER_STYLE}">Category</th>
          <th style="${TABLE_HEADER_STYLE}">Task</th>
          <th style="${TABLE_HEADER_STYLE};text-align:right;">Hours</th>
          <th style="${TABLE_HEADER_STYLE}">Status</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function getDefaultTaskHoursEmailTemplate(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{{email.subject}}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:700px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:#1a1d2e;padding:32px;">
              <h1 style="margin:0;font-size:24px;font-weight:700;color:#ffffff;">{{email.title}}</h1>
              <p style="margin:8px 0 0;font-size:14px;color:#cbd5e1;">{{email.subtitle}}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0;font-size:14px;color:#1e293b;">Hi there,</p>
              <p style="margin:16px 0 0;font-size:14px;line-height:1.6;color:#334155;">
                Please find below the summary of billable hours for the period
                <strong style="color:#0f172a;">{{period.startDate}}</strong> to
                <strong style="color:#0f172a;">{{period.endDate}}</strong>.
              </p>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;">
                <tr>
                  <td style="background:#f0f9f4;border-radius:12px;padding:32px;text-align:center;">
                    <p style="margin:0;font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;">Total billable hours</p>
                    <p style="margin:8px 0 0;font-size:36px;font-weight:700;color:#166534;font-variant-numeric:tabular-nums;">{{summary.totalBillableHours}}</p>
                  </td>
                </tr>
              </table>

              <h2 style="margin:32px 0 0;font-size:16px;font-weight:700;color:#0f172a;">Billable Hours Breakdown</h2>
              <div style="margin-top:16px;">{{billableHoursBreakdownTable}}</div>

              <h2 style="margin:32px 0 0;font-size:16px;font-weight:700;color:#0f172a;">Task Breakdown</h2>
              <div style="margin-top:16px;">{{taskBreakdownTable}}</div>

              <div style="margin-top:32px;padding-top:24px;border-top:1px solid #e2e8f0;font-size:14px;color:#334155;">
                <p style="margin:0;">Thanks and Regards,</p>
                <p style="margin:8px 0 0;font-weight:600;color:#0f172a;">{{signature.name}}</p>
                <p style="margin:4px 0 0;color:#475569;">{{signature.email}}</p>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function renderTaskHoursEmailTemplate(
  template: string,
  report: TaskHoursEmailReport,
): string {
  const replacements: Record<string, string> = {
    '{{email.subject}}': escapeHtml(report.email.subject),
    '{{email.title}}': escapeHtml(report.email.title),
    '{{email.subtitle}}': escapeHtml(report.email.subtitle),
    '{{period.startDate}}': escapeHtml(report.period.startDate),
    '{{period.endDate}}': escapeHtml(report.period.endDate),
    '{{summary.totalBillableHours}}': formatReportHours(report.summary.totalBillableHours),
    '{{billableHoursBreakdownTable}}': renderBillableHoursBreakdownTable(report),
    '{{taskBreakdownTable}}': renderTaskBreakdownTable(report),
    '{{signature.name}}': escapeHtml(report.signature.name),
    '{{signature.email}}': escapeHtml(getSignatureDetail(report.signature)),
  };

  let rendered = template;

  for (const [placeholder, value] of Object.entries(replacements)) {
    rendered = rendered.split(placeholder).join(value);
  }

  return rendered;
}
