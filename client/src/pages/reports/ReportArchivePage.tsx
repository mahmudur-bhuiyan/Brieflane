import { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppLayout } from '../../components/layout/AppLayout';
import { IconEye } from '../../components/common/icons';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { DataTable, type DataTableColumn } from '../../components/ui/DataTable';
import { PageHeader } from '../../components/ui/PageHeader';
import { Select } from '../../components/ui/Input';
import { useAuth } from '../../context/AuthContext';
import { getApiErrorMessage, useProjectsQuery } from '../../lib/queries/projects';
import {
  useResendTaskHoursReportMutation,
  useTaskHoursReportQuery,
  useTaskHoursReportsQuery,
} from '../../lib/queries/task-hours-reports';
import { toast } from '../../lib/toast';
import { isSuperAdmin } from '../../lib/roles';
import { DEFAULT_PAGE_SIZE, type PageSize, type SortOrder } from '../../types/pagination';
import { ReportArchiveDetailModal } from './components/ReportArchiveDetailModal';
import type { TaskHoursReportArchiveListRecord } from './types/taskHoursReportArchive';
import {
  filterArchives,
  formatArchiveCreatedBy,
  formatArchiveHours,
  formatArchivePeriod,
  formatArchiveWhen,
  sortArchives,
} from './utils/reportArchive';

export function ReportArchivePage() {
  const { user } = useAuth();
  const superAdmin = isSuperAdmin(user?.role);
  const [projectFilter, setProjectFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(DEFAULT_PAGE_SIZE);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [selectedArchiveId, setSelectedArchiveId] = useState<string | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);

  const { data: projectsData } = useProjectsQuery('');
  const { data, isPending, isError, error } = useTaskHoursReportsQuery({
    projectId: projectFilter || undefined,
    limit: 100,
  });

  const { data: detailData } = useTaskHoursReportQuery(selectedArchiveId ?? undefined);
  const resendArchive = useResendTaskHoursReportMutation();

  const archives = data?.archives ?? [];
  const loadError = isError ? getApiErrorMessage(error, 'Failed to load report archive') : null;

  const projectOptions = useMemo(() => {
    const projects = projectsData?.projects ?? [];

    return [
      { value: '', label: 'All projects' },
      ...projects.map((project) => ({
        value: project.id,
        label: project.name,
      })),
    ];
  }, [projectsData?.projects]);

  const filteredArchives = useMemo(() => filterArchives(archives, search), [archives, search]);

  const sortedArchives = useMemo(
    () => sortArchives(filteredArchives, sortBy, sortOrder),
    [filteredArchives, sortBy, sortOrder],
  );

  const paginatedArchives = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedArchives.slice(start, start + pageSize);
  }, [sortedArchives, page, pageSize]);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  const handlePageSizeChange = useCallback((nextPageSize: PageSize) => {
    setPageSize(nextPageSize);
    setPage(1);
  }, []);

  const handleSortChange = useCallback((nextSortBy: string, nextSortOrder: SortOrder) => {
    setSortBy(nextSortBy);
    setSortOrder(nextSortOrder);
    setPage(1);
  }, []);

  const handleProjectFilterChange = useCallback((value: string) => {
    setProjectFilter(value);
    setPage(1);
  }, []);

  const handleView = useCallback((archive: TaskHoursReportArchiveListRecord) => {
    setSelectedArchiveId(archive.id);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedArchiveId(null);
  }, []);

  const handleResend = useCallback(
    async (archiveId: string) => {
      setResendingId(archiveId);

      try {
        await resendArchive.mutateAsync(archiveId);
        toast.success('Gmail draft workflow started.');
      } catch (err) {
        toast.error(getApiErrorMessage(err, 'Failed to resend archived report.'));
      } finally {
        setResendingId(null);
      }
    },
    [resendArchive],
  );

  const columns: DataTableColumn<TaskHoursReportArchiveListRecord>[] = useMemo(() => {
    const baseColumns: DataTableColumn<TaskHoursReportArchiveListRecord>[] = [
      {
        id: 'projectName',
        header: 'Project',
        width: superAdmin ? 25 : 24,
        align: 'left',
        sortable: true,
        cell: (archive) => (
          <>
            <Link
              to={`/projects/${archive.projectId}`}
              className="font-medium text-heading hover:text-emerald-400"
            >
              {archive.projectName}
            </Link>
            <p className="mt-0.5 text-xs text-faint">AC {archive.acProjectId}</p>
          </>
        ),
      },
      {
        id: 'periodStart',
        header: 'Period',
        width: superAdmin ? 10 : 20,
        align: 'center',
        sortable: true,
        cell: (archive) => <span className="text-muted">{formatArchivePeriod(archive)}</span>,
      },
      {
        id: 'totalBillableHours',
        header: 'Billable',
        width: 10,
        align: 'center',
        sortable: true,
        cell: (archive) => (
          <span className="tabular-nums text-muted">
            {formatArchiveHours(archive.totalBillableHours)}h
          </span>
        ),
      },
    ];

    if (superAdmin) {
      baseColumns.push({
        id: 'createdByName',
        header: 'Created by',
        width: 15,
        align: 'center',
        sortable: true,
        cell: (archive) => <span className="text-muted">{formatArchiveCreatedBy(archive)}</span>,
      });
    }

    baseColumns.push(
      {
        id: 'createdAt',
        header: 'Date',
        width: superAdmin ? 15 : 18,
        align: 'center',
        sortable: true,
        cell: (archive) => (
          <span className="text-muted">{formatArchiveWhen(archive.createdAt)}</span>
        ),
      },
      {
        id: 'lastResendAt',
        header: 'Resend date',
        width: superAdmin ? 15 : 18,
        align: 'center',
        sortable: true,
        cell: (archive) => (
          <span className="text-muted">
            {archive.lastResendAt ? formatArchiveWhen(archive.lastResendAt) : '—'}
          </span>
        ),
      },
      {
        id: 'actions',
        header: 'Actions',
        width: 10,
        align: 'center',
        cell: (archive) => (
          <Button type="button" variant="secondary" size="sm" onClick={() => handleView(archive)}>
            <IconEye className="h-4 w-4" />
            View
          </Button>
        ),
      },
    );

    return baseColumns;
  }, [handleView, superAdmin]);

  return (
    <AppLayout
      title="Report archive"
      description="Review archived task-hours reports and resend Gmail drafts."
    >
      <PageHeader
        title="Report archive"
        description="Every Gmail draft from Generate report is saved here with the exact payload sent to n8n."
      />

      <Card padding={false} className="overflow-hidden">
        <DataTable
          columns={columns}
          data={paginatedArchives}
          rowKey={(archive) => archive.id}
          isLoading={isPending}
          error={loadError}
          search={search}
          onSearchChange={handleSearchChange}
          searchPlaceholder="Filter reports…"
          toolbarStart={
            <div className="w-full shrink-0 sm:w-56">
              <Select
                label="Project"
                value={projectFilter}
                onChange={(event) => handleProjectFilterChange(event.target.value)}
              >
                {projectOptions.map((option) => (
                  <option key={option.value || 'all'} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>
          }
          page={page}
          pageSize={pageSize}
          total={sortedArchives.length}
          onPageChange={setPage}
          onPageSizeChange={handlePageSizeChange}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSortChange={handleSortChange}
          emptyTitle={
            search.trim() || projectFilter
              ? 'No archived reports match your filters'
              : 'No archived reports yet'
          }
          emptyDescription={
            search.trim()
              ? 'Try a different project name, email, or date.'
              : projectFilter
                ? 'No reports found for this project.'
                : 'Generate a task-hours report to create the first archive entry.'
          }
          renderMobileRow={(archive) => (
            <div className="rounded-xl border border-subtle bg-subtle p-4">
              <div className="min-w-0">
                <Link
                  to={`/projects/${archive.projectId}`}
                  className="font-medium text-heading hover:text-emerald-400"
                >
                  {archive.projectName}
                </Link>
                <p className="mt-1 text-xs text-faint">AC {archive.acProjectId}</p>
              </div>
              <dl className="mt-3 space-y-2 text-sm">
                <div>
                  <dt className="text-xs text-faint">Period</dt>
                  <dd className="text-muted">{formatArchivePeriod(archive)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-faint">Billable</dt>
                  <dd className="tabular-nums text-muted">
                    {formatArchiveHours(archive.totalBillableHours)}h
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-faint">Created</dt>
                  <dd className="text-muted">
                    {formatArchiveWhen(archive.createdAt)}
                    {superAdmin ? ` by ${formatArchiveCreatedBy(archive)}` : null}
                  </dd>
                </div>
                {archive.lastResendAt ? (
                  <div>
                    <dt className="text-xs text-faint">Resend date</dt>
                    <dd className="text-muted">{formatArchiveWhen(archive.lastResendAt)}</dd>
                  </div>
                ) : null}
              </dl>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="mt-4 w-full"
                onClick={() => handleView(archive)}
              >
                <IconEye className="h-4 w-4" />
                View
              </Button>
            </div>
          )}
        />
      </Card>

      <ReportArchiveDetailModal
        archive={detailData?.archive ?? null}
        isResending={resendingId === selectedArchiveId}
        onClose={handleCloseDetail}
        onResend={(archiveId) => void handleResend(archiveId)}
      />
    </AppLayout>
  );
}
