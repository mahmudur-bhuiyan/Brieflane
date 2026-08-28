import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { IconCopy, IconMail, IconMaximize, IconRefresh } from '../../../components/common/icons';
import { Button } from '../../../components/ui/Button';
import { Textarea } from '../../../components/ui/Input';
import { Modal } from '../../../components/ui/Modal';
import { getApiErrorMessage, useDraftGmailReportMutation } from '../../../lib/queries/projects';
import { toast } from '../../../lib/toast';
import type { TaskHoursEmailReport } from '../types/taskHoursReport';
import {
  EMAIL_TEMPLATE_PLACEHOLDERS,
  getDefaultTaskHoursEmailTemplate,
  renderTaskHoursEmailTemplate,
} from '../utils/emailTemplate';

type TemplateMode = 'prebuilt' | 'custom';

const TEMPLATE_MODE_PARAM = 'template';

function parseTemplateMode(value: string | null): TemplateMode {
  return value === 'custom' ? 'custom' : 'prebuilt';
}

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
      ::-webkit-scrollbar-thumb:hover {
        background-color: rgba(100, 116, 139, 0.7);
      }
    </style>`;

  if (/<head[\s>]/i.test(html)) {
    return html.replace(/<head([^>]*)>/i, `<head$1>${styles}`);
  }

  return `${styles}${html}`;
}

const previewPanelButtonClassName =
  '!border-slate-300 !bg-white !text-slate-700 hover:!bg-slate-50 hover:!text-slate-900';

type TaskHoursEmailTemplateViewProps = {
  projectId: string;
  report: TaskHoursEmailReport;
};

function ModeButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
        active ? 'bg-surface text-heading shadow-sm' : 'text-muted hover:text-heading'
      }`}
    >
      {children}
    </button>
  );
}

export function TaskHoursEmailTemplateView({ projectId, report }: TaskHoursEmailTemplateViewProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const draftGmail = useDraftGmailReportMutation(projectId);
  const defaultTemplate = useMemo(() => getDefaultTaskHoursEmailTemplate(), []);
  const mode = parseTemplateMode(searchParams.get(TEMPLATE_MODE_PARAM));
  const [customTemplate, setCustomTemplate] = useState(defaultTemplate);
  const [fullPagePreviewOpen, setFullPagePreviewOpen] = useState(false);

  const activeTemplate = mode === 'prebuilt' ? defaultTemplate : customTemplate;

  const renderedHtml = useMemo(
    () => renderTaskHoursEmailTemplate(activeTemplate, report),
    [activeTemplate, report],
  );

  const previewHtml = useMemo(
    () => withPreviewScrollbarStyles(renderedHtml),
    [renderedHtml],
  );

  const handleModeChange = useCallback(
    (nextMode: TemplateMode) => {
      if (nextMode === 'custom' && mode === 'prebuilt') {
        setCustomTemplate(defaultTemplate);
      }

      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current);
          if (nextMode === 'custom') {
            next.set(TEMPLATE_MODE_PARAM, 'custom');
          } else {
            next.delete(TEMPLATE_MODE_PARAM);
          }
          return next;
        },
        { replace: true },
      );
    },
    [defaultTemplate, mode, setSearchParams],
  );

  const handleReset = useCallback(() => {
    setCustomTemplate(defaultTemplate);
    toast.success('Template reset to prebuilt default.');
  }, [defaultTemplate]);

  const handleCopyHtml = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(renderedHtml);
      toast.success('Rendered email HTML copied to clipboard.');
    } catch {
      toast.error('Failed to copy HTML.');
    }
  }, [renderedHtml]);

  const handleDraftGmail = useCallback(async () => {
    try {
      await draftGmail.mutateAsync({
        emailTemplate: activeTemplate,
        json: report,
      });
      toast.success('Gmail draft workflow started.');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to start Gmail draft workflow.'));
    }
  }, [activeTemplate, draftGmail, report]);

  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-3 border-b border-subtle px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5 lg:px-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="inline-flex rounded-xl border border-subtle bg-subtle p-1">
            <ModeButton active={mode === 'prebuilt'} onClick={() => handleModeChange('prebuilt')}>
              Prebuilt template
            </ModeButton>
            <ModeButton active={mode === 'custom'} onClick={() => handleModeChange('custom')}>
              Custom template
            </ModeButton>
          </div>
          <p className="text-xs text-muted">
            {mode === 'prebuilt'
              ? 'Using the default Brieflane email layout.'
              : 'Edit the HTML below or paste your own template.'}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {mode === 'custom' ? (
            <Button type="button" variant="secondary" size="sm" onClick={handleReset}>
              <IconRefresh className="h-4 w-4" />
              Reset to default
            </Button>
          ) : null}
          <Button type="button" variant="secondary" size="sm" onClick={handleCopyHtml}>
            <IconCopy className="h-4 w-4" />
            Copy HTML
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleDraftGmail}
            disabled={draftGmail.isPending}
          >
            <IconMail className="h-4 w-4" />
            {draftGmail.isPending ? 'Drafting…' : 'Draft in Gmail'}
          </Button>
        </div>
      </div>

      <div className="grid gap-0 lg:grid-cols-2 lg:items-stretch">
        <div className="flex flex-col border-b border-subtle lg:border-b-0 lg:border-r">
          {mode === 'custom' ? (
            <div className="flex flex-1 flex-col p-4 sm:p-5 lg:p-6">
              <details className="mb-4 shrink-0 rounded-xl border border-subtle bg-subtle p-3">
                <summary className="cursor-pointer text-sm font-medium text-heading">
                  Available placeholders
                </summary>
                <ul className="mt-3 space-y-2 text-xs text-muted">
                  {EMAIL_TEMPLATE_PLACEHOLDERS.map((placeholder) => (
                    <li key={placeholder.key}>
                      <code className="rounded bg-surface px-1.5 py-0.5 font-mono text-heading">
                        {placeholder.key}
                      </code>
                      <span className="ml-2">{placeholder.description}</span>
                    </li>
                  ))}
                </ul>
              </details>

              <div
                className="flex min-h-150 flex-1 flex-col [&_label]:flex [&_label]:min-h-0 [&_label]:flex-1 [&_label]:flex-col [&_label>div]:mt-0 [&_label>div]:flex [&_label>div]:min-h-0 [&_label>div]:flex-1 [&_label>div]:flex-col"
              >
                <Textarea
                  label="Email template HTML"
                  hideLabel
                  value={customTemplate}
                  onChange={(event) => setCustomTemplate(event.target.value)}
                  className="scrollbar-thin min-h-150 h-full flex-1 resize-none font-mono text-xs leading-relaxed sm:text-sm"
                  spellCheck={false}
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-1 flex-col p-4 sm:p-5 lg:p-6">
              <p className="shrink-0 text-sm text-muted">
                The prebuilt template uses standard placeholders for report data. Switch to{' '}
                <strong className="font-medium text-heading">Custom template</strong> to edit or
                paste your own HTML.
              </p>
              <pre className="scrollbar-thin mt-4 min-h-150 flex-1 overflow-auto rounded-xl border border-subtle bg-subtle p-4 text-xs leading-relaxed text-heading">
                {defaultTemplate}
              </pre>
            </div>
          )}
        </div>

        <div className="flex flex-col bg-slate-100 p-4 sm:p-5 lg:p-6">
          <div className="mb-3 flex shrink-0 items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Live preview
            </p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className={previewPanelButtonClassName}
              onClick={() => setFullPagePreviewOpen(true)}
            >
              <IconMaximize className="h-4 w-4" />
              Full page view
            </Button>
          </div>
          <div className="flex min-h-150 flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <iframe
              title="Email template preview"
              srcDoc={previewHtml}
              className="h-full min-h-150 w-full flex-1 border-0"
              sandbox="allow-same-origin"
            />
          </div>
        </div>
      </div>

      {fullPagePreviewOpen ? (
        <Modal
          title="Email preview"
          description={report.email.subject}
          size="full"
          bodyClassName="flex min-h-0 flex-1 flex-col overflow-hidden"
          onClose={() => setFullPagePreviewOpen(false)}
        >
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
            <iframe
              title="Email template full page preview"
              srcDoc={previewHtml}
              className="h-full min-h-0 w-full border-0 bg-white"
              sandbox="allow-same-origin"
            />
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
