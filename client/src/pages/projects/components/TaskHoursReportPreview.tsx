import type { ReactNode } from 'react';
import { Badge } from '../../../components/ui/Badge';
import { formatReportHours } from '../utils/taskHoursReport';
import type { TaskHoursEmailReport } from '../types/taskHoursReport';

type TaskHoursReportPreviewProps = {
  report: TaskHoursEmailReport;
};

function BreakdownTable({
  headers,
  rows,
  footer,
  rightAlignIndex,
}: {
  headers: string[];
  rows: ReactNode[][];
  footer?: ReactNode[];
  rightAlignIndex?: number;
}) {
  const isRightAligned = (index: number) => rightAlignIndex === index;

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-[#1a1d2e] text-left text-white">
            {headers.map((header, index) => (
              <th
                key={header}
                className={`px-4 py-2.5 text-xs font-semibold uppercase tracking-wide ${
                  isRightAligned(index) ? 'text-right' : 'text-left'
                }`}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((cells, rowIndex) => (
            <tr key={rowIndex} className="border-t border-slate-200 bg-white">
              {cells.map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  className={`px-4 py-3 text-slate-700 ${
                    isRightAligned(cellIndex) ? 'text-right tabular-nums' : ''
                  }`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        {footer ? (
          <tfoot>
            <tr className="border-t border-slate-200 bg-slate-50 font-semibold text-slate-900">
              {footer.map((cell, index) => (
                <td
                  key={index}
                  className={`px-4 py-3 ${
                    isRightAligned(index) ? 'text-right tabular-nums' : ''
                  }`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          </tfoot>
        ) : null}
      </table>
    </div>
  );
}

export function TaskHoursReportPreview({ report }: TaskHoursReportPreviewProps) {
  const breakdownTotal = report.billableHoursBreakdown.reduce(
    (sum, row) => sum + row.hours,
    0,
  );

  return (
    <div className="w-full bg-slate-100 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto w-full max-w-175 overflow-hidden rounded-xl bg-white shadow-sm">
        <div className="bg-[#1a1d2e] px-6 py-8 sm:px-8">
          <h2 className="text-xl font-bold text-white sm:text-2xl">{report.email.title}</h2>
          <p className="mt-2 text-sm text-slate-300">{report.email.subtitle}</p>
        </div>

        <div className="px-6 py-6 sm:px-8 sm:py-8">
          <p className="text-sm text-slate-800">Hi there,</p>
          <p className="mt-4 text-sm leading-relaxed text-slate-700">
            Please find below the summary of billable hours for the period{' '}
            <strong className="font-semibold text-slate-900">{report.period.startDate}</strong> to{' '}
            <strong className="font-semibold text-slate-900">{report.period.endDate}</strong>.
          </p>

          <div className="mt-6 rounded-xl bg-[#f0f9f4] px-6 py-8 text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total billable hours
            </p>
            <p className="mt-2 text-4xl font-bold tabular-nums text-[#166534]">
              {formatReportHours(report.summary.totalBillableHours)}
            </p>
          </div>

          <h3 className="mt-8 text-base font-bold text-slate-900">Billable Hours Breakdown</h3>
          <div className="mt-4">
            <BreakdownTable
              headers={['Category', 'Hours']}
              rightAlignIndex={1}
              rows={report.billableHoursBreakdown.map((row) => [
                row.category,
                formatReportHours(row.hours),
              ])}
              footer={['Total', formatReportHours(breakdownTotal)]}
            />
          </div>

          <h3 className="mt-8 text-base font-bold text-slate-900">Task Breakdown</h3>
          <div className="mt-4">
            <BreakdownTable
              headers={['User', 'Category', 'Task', 'Hours', 'Status']}
              rightAlignIndex={3}
              rows={report.taskBreakdown.map((row) => [
                <span key="user" className="font-medium text-slate-900">
                  {row.userName}
                </span>,
                row.category,
                row.taskDescription,
                formatReportHours(row.hours),
                <Badge
                  key="status"
                  variant={row.status === 'Billable' ? 'success' : 'neutral'}
                >
                  {row.status}
                </Badge>,
              ])}
            />
          </div>

          <div className="mt-8 border-t border-slate-200 pt-6 text-sm text-slate-700">
            <p>Thanks and Regards,</p>
            <p className="mt-2 font-semibold text-slate-900">{report.signature.name}</p>
            <p className="text-slate-600">{report.signature.email}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
