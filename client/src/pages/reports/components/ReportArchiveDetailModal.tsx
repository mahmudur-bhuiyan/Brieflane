import { useMemo } from 'react';
import { IconMail } from '../../../components/common/icons';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { getCustomHoursTypeLabel } from '../../projects/utils/customHours';
import { formatArchiveCreatedBy } from '../utils/reportArchive';
import type { TaskHoursReportArchiveDetailRecord } from '../types/taskHoursReportArchive';

type ReportArchiveDetailModalProps = {
  archive: TaskHoursReportArchiveDetailRecord | null;
  isResending: boolean;
  onClose: () => void;
  onResend: (archiveId: string) => void;
};

function withPreviewScrollbarStyles(html: string): string {
  const styles = `
    <style>
      html {
        scrollbar-width: thin;
        scrollbar-color: rgba(100, 116, 139, 0.5) transparent;
      }
      ::-webkit-scrollbar {
        width: 4px;
        height: 4px;
      }
      ::-webkit-scrollbar-track {
        background: transparent;
      }
      ::-webkit-scrollbar-thumb {
        background-color: rgba(100, 116, 139, 0.45);
        border-radius: 9999px;
      }
    </style>`;

  if (/<head[\s>]/i.test(html)) {
    return html.replace(/<head([^>]*)>/i, `<head$1>${styles}`);
  }

  return `${styles}${html}`;
}

export function ReportArchiveDetailModal({
  archive,
  isResending,
  onClose,
  onResend,
}: ReportArchiveDetailModalProps) {
  const previewHtml = useMemo(() => {
    if (!archive) {
      return '';
    }

    return withPreviewScrollbarStyles(archive.n8nPayload.email.template);
  }, [archive]);

  if (!archive) {
    return null;
  }

  const { report, customHours } = archive.n8nPayload.formattedData;

  return (
    <Modal
      title={archive.subject}
      description={`${archive.projectName} — ${archive.recipientEmail}`}
      size="full"
      bodyClassName="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto"
      onClose={onClose}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={archive.status === 'drafted' ? 'success' : 'warning'}>
            {archive.status}
          </Badge>
          {archive.resentFromId ? <Badge variant="neutral">Resent copy</Badge> : null}
        </div>
        <Button
          type="button"
          size="sm"
          disabled={isResending}
          onClick={() => onResend(archive.id)}
        >
          <IconMail className="h-4 w-4" />
          {isResending ? 'Resending…' : 'Resend to Gmail'}
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-subtle bg-subtle p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Period</p>
          <p className="mt-1 text-sm font-medium text-heading">{report.period.formatted}</p>
        </div>
        <div className="rounded-xl border border-subtle bg-subtle p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Billable hours</p>
          <p className="mt-1 text-sm font-medium tabular-nums text-heading">
            {report.summary.totalBillableHours.toFixed(2)}h
          </p>
        </div>
        <div className="rounded-xl border border-subtle bg-subtle p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Created by</p>
          <p className="mt-1 text-sm font-medium text-heading">{formatArchiveCreatedBy(archive)}</p>
        </div>
        <div className="rounded-xl border border-subtle bg-subtle p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Archived</p>
          <p className="mt-1 text-sm font-medium text-heading">
            {new Date(archive.createdAt).toLocaleString()}
          </p>
        </div>
      </div>

      {customHours.length > 0 ? (
        <div className="rounded-xl border border-subtle bg-subtle p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Added hours</p>
          <ul className="mt-3 space-y-2">
            {customHours.map((entry) => (
              <li
                key={entry.id}
                className="rounded-lg border border-subtle bg-surface px-3 py-2 text-sm text-heading"
              >
                <span className="font-medium">
                  {getCustomHoursTypeLabel(entry.type)} · {entry.hours.toFixed(2)}h
                </span>
                <span className="mt-0.5 block text-xs text-muted">
                  {entry.userName} — {entry.jobType} — {entry.description}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {archive.resends.length > 0 ? (
        <div className="rounded-xl border border-subtle bg-subtle p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Resend history</p>
          <ul className="mt-3 space-y-2">
            {archive.resends.map((resend) => (
              <li
                key={resend.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-subtle bg-surface px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium text-heading">{resend.createdByEmail}</p>
                  <p className="text-xs text-muted">{new Date(resend.createdAt).toLocaleString()}</p>
                  {resend.errorMessage ? (
                    <p className="mt-1 text-xs text-red-400">{resend.errorMessage}</p>
                  ) : null}
                </div>
                <Badge variant={resend.status === 'drafted' ? 'success' : 'warning'}>
                  {resend.status}
                </Badge>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="flex min-h-100 flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
        <p className="border-b border-slate-200 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
          Archived email preview
        </p>
        <iframe
          title="Archived report email preview"
          srcDoc={previewHtml}
          className="h-full min-h-100 w-full flex-1 border-0 bg-white"
          sandbox="allow-same-origin"
        />
      </div>
    </Modal>
  );
}
