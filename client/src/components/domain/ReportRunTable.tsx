import { Link } from 'react-router-dom';
import { Badge } from '../ui/Badge';
import type {
  ReportRunListRecord,
  ReportRunStatus,
  ReportRunSummary,
} from '../../types/report';

function statusVariant(status: ReportRunStatus): 'success' | 'warning' | 'accent' | 'neutral' {
  switch (status) {
    case 'completed':
      return 'success';
    case 'failed':
      return 'warning';
    case 'running':
      return 'accent';
    default:
      return 'neutral';
  }
}

function formatWhen(value: string): string {
  return new Date(value).toLocaleString();
}

export function ReportRunTable({
  reportRuns,
  showProject = true,
  emptyMessage = 'No report runs yet.',
}: {
  reportRuns: ReportRunListRecord[];
  showProject?: boolean;
  emptyMessage?: string;
}) {
  if (reportRuns.length === 0) {
    return <p className="text-sm text-muted">{emptyMessage}</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[32rem] text-left text-sm">
        <thead>
          <tr className="border-b border-subtle text-xs uppercase tracking-wider text-faint">
            {showProject && <th className="pb-3 pr-4 font-medium">Project</th>}
            <th className="pb-3 pr-4 font-medium">Status</th>
            <th className="pb-3 pr-4 font-medium">Triggered by</th>
            <th className="pb-3 pr-4 font-medium">Started</th>
            <th className="pb-3 font-medium">Details</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-(--border)">
          {reportRuns.map((run) => (
            <tr key={run.id} className="align-top">
              {showProject && (
                <td className="py-3 pr-4">
                  <Link
                    to={`/projects/${run.projectId}`}
                    className="font-medium text-heading hover:text-emerald-400"
                  >
                    {run.projectName}
                  </Link>
                  <p className="mt-0.5 text-xs text-faint">AC {run.acProjectId}</p>
                </td>
              )}
              <td className="py-3 pr-4">
                <Badge variant={statusVariant(run.status)}>{run.status}</Badge>
              </td>
              <td className="py-3 pr-4 text-muted">{run.triggeredByEmail}</td>
              <td className="py-3 pr-4 text-muted">{formatWhen(run.createdAt)}</td>
              <td className="py-3 text-muted">
                {run.errorMessage ? (
                  <span className="text-amber-600 dark:text-amber-300">{run.errorMessage}</span>
                ) : run.n8nExecutionId ? (
                  <span className="text-faint">n8n {run.n8nExecutionId}</span>
                ) : (
                  <span className="text-faint">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ReportRunSummaryCards({ summary }: { summary: ReportRunSummary }) {
  const items = [
    { label: 'Total runs', value: summary.total },
    { label: 'Completed', value: summary.completed },
    { label: 'Failed', value: summary.failed },
    { label: 'Running', value: summary.running },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-xl border border-subtle bg-subtle/50 px-4 py-3"
        >
          <p className="text-xs text-muted">{item.label}</p>
          <p className="mt-1 text-2xl font-semibold text-heading">{item.value}</p>
        </div>
      ))}
    </div>
  );
}
