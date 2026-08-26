import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { IconCopy } from '../../../components/common/icons';
import { Button } from '../../../components/ui/Button';
import { toast } from '../../../lib/toast';
import type { TaskHoursEmailReport } from '../types/taskHoursReport';
import { TaskHoursReportPreview } from './TaskHoursReportPreview';

type ReportViewTab = 'preview' | 'json';

function TabButton({
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
      className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
        active ? 'bg-surface text-heading shadow-sm' : 'text-muted hover:text-heading'
      }`}
    >
      {children}
    </button>
  );
}

export function TaskHoursReportView({ report }: { report: TaskHoursEmailReport }) {
  const [activeTab, setActiveTab] = useState<ReportViewTab>('preview');
  const formattedJson = useMemo(() => JSON.stringify(report, null, 2), [report]);

  const handleCopyJson = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(formattedJson);
      toast.success('Report JSON copied to clipboard.');
    } catch {
      toast.error('Failed to copy JSON.');
    }
  }, [formattedJson]);

  return (
    <div>
      <div className="flex flex-col items-end gap-3 border-b border-subtle px-4 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-5 sm:py-5 lg:px-6">
        {activeTab === 'json' ? (
          <Button type="button" variant="secondary" size="sm" onClick={handleCopyJson}>
            <IconCopy className="h-4 w-4" />
            Copy JSON
          </Button>
        ) : null}

        <div className="inline-flex w-full rounded-xl border border-subtle bg-subtle p-1 sm:w-auto">
          <TabButton active={activeTab === 'preview'} onClick={() => setActiveTab('preview')}>
            Email preview
          </TabButton>
          <TabButton active={activeTab === 'json'} onClick={() => setActiveTab('json')}>
            JSON
          </TabButton>
        </div>
      </div>

      {activeTab === 'preview' ? (
        <TaskHoursReportPreview report={report} />
      ) : (
        <pre className="scrollbar-thin max-h-[min(75dvh,52rem)] overflow-auto border-subtle bg-subtle p-4 text-xs leading-relaxed text-heading sm:p-5 sm:text-sm lg:p-6">
          {formattedJson}
        </pre>
      )}
    </div>
  );
}
