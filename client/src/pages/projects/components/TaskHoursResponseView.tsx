import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { IconCopy, IconPlus, IconTrash } from '../../../components/common/icons';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { DataTable, type DataTableColumn } from '../../../components/ui/DataTable';
import { toast } from '../../../lib/toast';
import { DEFAULT_PAGE_SIZE, type PageSize, type SortOrder } from '../../../types/pagination';
import type { CustomHoursEntry } from '../types/customHours';
import { getCustomHoursTypeLabel } from '../utils/customHours';
import { AddCustomHoursModal } from './AddCustomHoursModal';
import {
  customHoursToTableRows,
  filterTaskHoursRows,
  filterTaskHoursRowsByBillableStatus,
  formatTaskHoursColumnHeader,
  getBillableOnlySummary,
  getTaskHoursColumnAlign,
  getTaskHoursColumnWidth,
  mergeCustomHoursIntoSummary,
  parseTaskHoursSummary,
  parseTaskHoursTable,
  sortTaskHoursRows,
  TASK_HOURS_DISPLAY_COLUMNS,
  type TaskHoursSummary,
  type TaskHoursTableRow,
} from '../utils/taskHoursTable';

type TaskHoursViewTab = 'table' | 'json';

type TaskHoursResponseViewProps = {
  data: unknown;
  customHours?: CustomHoursEntry[];
  onCustomHoursChange?: (entries: CustomHoursEntry[]) => void;
  defaultUserName?: string;
};

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

function SummaryField({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold tabular-nums text-heading">{value}</p>
    </div>
  );
}

function TaskHoursSummaryPanel({
  summary,
  showNonBillable,
  onShowNonBillableChange,
  customHours,
  onAddHours,
  onRemoveCustomHours,
  canManageCustomHours,
}: {
  summary: TaskHoursSummary;
  showNonBillable: boolean;
  onShowNonBillableChange: (show: boolean) => void;
  customHours: CustomHoursEntry[];
  onAddHours: () => void;
  onRemoveCustomHours: (id: string) => void;
  canManageCustomHours: boolean;
}) {
  const customHoursTotal = customHours.reduce((sum, entry) => sum + entry.hours, 0);
  const summaryWithCustom =
    customHoursTotal > 0 ? mergeCustomHoursIntoSummary(summary, customHoursTotal) : summary;
  const displaySummary = showNonBillable
    ? summaryWithCustom
    : getBillableOnlySummary(summaryWithCustom);
  const dateRange =
    displaySummary.startDate !== '—' || displaySummary.endDate !== '—'
      ? `${displaySummary.startDate} – ${displaySummary.endDate}`
      : '—';

  return (
    <div className="border-b border-subtle px-4 py-4 sm:px-6">
      <div className="rounded-xl border border-subtle bg-subtle p-4 sm:p-5">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">Project</p>
            <p className="mt-1 truncate text-sm font-semibold text-heading">
              {displaySummary.projectName}
            </p>
          </div>
          <p className="shrink-0 text-xs text-faint">
            ID <span className="font-medium tabular-nums text-muted">{displaySummary.projectId}</span>
          </p>
        </div>

        <div
          className={`mt-4 grid grid-cols-2 gap-4 ${showNonBillable ? 'sm:grid-cols-4' : 'sm:grid-cols-3'}`}
        >
          <SummaryField label="Date Range" value={dateRange} />
          <SummaryField label="Billable Hours" value={displaySummary.totalBillableHours} />
          {showNonBillable ? (
            <SummaryField
              label="Non-Billable Hours"
              value={displaySummary.totalNonBillableHours}
            />
          ) : null}
          <SummaryField label="Total Logged Hours" value={displaySummary.totalLoggedHours} />
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-subtle bg-surface px-3 py-2.5">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={showNonBillable}
              onChange={(event) => onShowNonBillableChange(event.target.checked)}
            />
            <span className="text-sm text-heading">Show non-billable hours</span>
          </label>

          {canManageCustomHours ? (
            <Button type="button" variant="secondary" size="sm" onClick={onAddHours}>
              <IconPlus className="h-4 w-4" />
              Add hours
            </Button>
          ) : null}
        </div>

        {customHours.length > 0 ? (
          <div className="mt-4 rounded-lg border border-subtle bg-surface p-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">
              Added hours
            </p>
            <ul className="mt-2 space-y-2">
              {customHours.map((entry) => (
                <li
                  key={entry.id}
                  className="flex items-start justify-between gap-3 rounded-lg border border-subtle bg-subtle px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-heading">
                      {getCustomHoursTypeLabel(entry.type)} ·{' '}
                      <span className="tabular-nums">{entry.hours.toFixed(2)}h</span>
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted">
                      {entry.userName} — {entry.jobType} — {entry.description}
                    </p>
                  </div>
                  {canManageCustomHours ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-label="Remove added hours"
                      onClick={() => onRemoveCustomHours(entry.id)}
                    >
                      <IconTrash className="h-4 w-4" />
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function renderCellValue(columnKey: string, value: string) {
  const leafKey = columnKey.split('.').pop() ?? columnKey;

  if (leafKey === 'status' || leafKey === 'billable_status') {
    const isBillable = value.toLowerCase() === 'billable';
    return <Badge variant={isBillable ? 'success' : 'neutral'}>{value}</Badge>;
  }

  const isTextColumn =
    leafKey.includes('name') ||
    leafKey.includes('summary') ||
    leafKey.includes('email') ||
    leafKey === 'job_type';
  const isHoursColumn =
    leafKey === 'hours' ||
    leafKey === 'value' ||
    leafKey === 'tracked_time' ||
    leafKey === 'time' ||
    leafKey === 'duration' ||
    leafKey.endsWith('_hours');
  const isIdColumn = leafKey === 'task_id' || leafKey.endsWith('_id');

  return (
    <span
      className={
        isTextColumn
          ? 'font-medium text-heading'
          : isHoursColumn || isIdColumn
            ? 'tabular-nums text-heading'
            : 'text-muted'
      }
    >
      {value || '—'}
    </span>
  );
}

export function TaskHoursResponseView({
  data,
  customHours = [],
  onCustomHoursChange,
  defaultUserName,
}: TaskHoursResponseViewProps) {
  const [activeTab, setActiveTab] = useState<TaskHoursViewTab>('table');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(DEFAULT_PAGE_SIZE);
  const [sortBy, setSortBy] = useState('');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [showNonBillable, setShowNonBillable] = useState(false);
  const [showAddHours, setShowAddHours] = useState(false);

  const canManageCustomHours = onCustomHoursChange !== undefined;

  const formattedJson = useMemo(() => JSON.stringify(data, null, 2), [data]);
  const summary = useMemo(() => parseTaskHoursSummary(data), [data]);
  const parsedTable = useMemo(() => parseTaskHoursTable(data), [data]);
  const customTableRows = useMemo(() => customHoursToTableRows(customHours), [customHours]);
  const allTableRows = useMemo(
    () => [...parsedTable.rows, ...customTableRows],
    [parsedTable.rows, customTableRows],
  );

  const billableFilteredRows = useMemo(
    () => filterTaskHoursRowsByBillableStatus(allTableRows, showNonBillable),
    [allTableRows, showNonBillable],
  );

  const filteredRows = useMemo(
    () => filterTaskHoursRows(billableFilteredRows, search),
    [billableFilteredRows, search],
  );

  const sortedRows = useMemo(() => {
    if (!sortBy) {
      return filteredRows;
    }

    return sortTaskHoursRows(filteredRows, sortBy, sortOrder);
  }, [filteredRows, sortBy, sortOrder]);

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedRows.slice(start, start + pageSize);
  }, [sortedRows, page, pageSize]);

  const columns: DataTableColumn<TaskHoursTableRow>[] = useMemo(() => {
    const displayColumnById = new Map(
      TASK_HOURS_DISPLAY_COLUMNS.map((column) => [column.id, column]),
    );

    return parsedTable.columns.map((columnKey) => {
      const displayColumn = displayColumnById.get(columnKey);
      const leafKey = columnKey.split('.').pop() ?? columnKey;

      return {
        id: columnKey,
        header: displayColumn?.header ?? formatTaskHoursColumnHeader(columnKey),
        width:
          displayColumn?.width ?? getTaskHoursColumnWidth(columnKey, parsedTable.columns.length),
        align: displayColumn?.align ?? getTaskHoursColumnAlign(columnKey),
        sortable: true,
        cell: (row: TaskHoursTableRow) => renderCellValue(leafKey, row.values[columnKey] ?? '—'),
      };
    });
  }, [parsedTable.columns]);

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

  const handleShowNonBillableChange = useCallback((show: boolean) => {
    setShowNonBillable(show);
    setPage(1);
  }, []);

  const handleAddCustomHours = useCallback(
    (entry: CustomHoursEntry) => {
      if (!onCustomHoursChange) {
        return;
      }

      onCustomHoursChange([...customHours, entry]);
      toast.success('Hours added to the report.');
      setPage(1);
    },
    [customHours, onCustomHoursChange],
  );

  const handleRemoveCustomHours = useCallback(
    (entryId: string) => {
      if (!onCustomHoursChange) {
        return;
      }

      onCustomHoursChange(customHours.filter((entry) => entry.id !== entryId));
      toast.success('Added hours removed.');
      setPage(1);
    },
    [customHours, onCustomHoursChange],
  );

  const handleCopyJson = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(formattedJson);
      toast.success('JSON copied to clipboard.');
    } catch {
      toast.error('Failed to copy JSON.');
    }
  }, [formattedJson]);

  return (
    <div>
      <div className="border-b border-subtle px-5 py-4 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-heading">Task hours response</h2>
            <p className="mt-1 text-sm text-muted">
              Browse fetched data in a table or inspect the raw JSON from{' '}
              <code className="rounded bg-subtle px-1.5 py-0.5 text-xs">
                ac-project-user-task-hours
              </code>
              .
            </p>
          </div>

          <div className="inline-flex w-full rounded-xl border border-subtle bg-subtle p-1 sm:w-auto">
            <TabButton active={activeTab === 'table'} onClick={() => setActiveTab('table')}>
              Table
            </TabButton>
            <TabButton active={activeTab === 'json'} onClick={() => setActiveTab('json')}>
              JSON
            </TabButton>
          </div>
        </div>
      </div>

      {activeTab === 'table' ? (
        allTableRows.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="text-sm font-medium text-heading">No table rows found</p>
            <p className="mt-1 text-sm text-faint">
              The response does not contain recognizable row data. Switch to the JSON tab to inspect
              the raw payload.
            </p>
          </div>
        ) : (
          <>
            {summary ? (
              <TaskHoursSummaryPanel
                summary={summary}
                showNonBillable={showNonBillable}
                onShowNonBillableChange={handleShowNonBillableChange}
                customHours={customHours}
                onAddHours={() => setShowAddHours(true)}
                onRemoveCustomHours={handleRemoveCustomHours}
                canManageCustomHours={canManageCustomHours}
              />
            ) : (
              <div className="border-b border-subtle px-4 py-4 sm:px-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-subtle bg-subtle px-3 py-2.5">
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={showNonBillable}
                      onChange={(event) => handleShowNonBillableChange(event.target.checked)}
                    />
                    <span className="text-sm text-heading">Show non-billable hours</span>
                  </label>
                  {canManageCustomHours ? (
                    <Button type="button" variant="secondary" size="sm" onClick={() => setShowAddHours(true)}>
                      <IconPlus className="h-4 w-4" />
                      Add hours
                    </Button>
                  ) : null}
                </div>
              </div>
            )}
            <DataTable
              columns={columns}
              data={paginatedRows}
              rowKey={(row) => row.id}
              search={search}
              onSearchChange={handleSearchChange}
              searchPlaceholder="Search task hours…"
              page={page}
              pageSize={pageSize}
              total={sortedRows.length}
              onPageChange={setPage}
              onPageSizeChange={handlePageSizeChange}
              sortBy={sortBy || parsedTable.columns[0] || ''}
              sortOrder={sortOrder}
              onSortChange={handleSortChange}
              emptyTitle="No matching rows"
              emptyDescription="Try a different search term."
            />
          </>
        )
      ) : (
        <div className="p-4 sm:p-6">
          <div className="mb-3 flex justify-end">
            <Button type="button" variant="secondary" size="sm" onClick={handleCopyJson}>
              <IconCopy className="h-4 w-4" />
              Copy JSON
            </Button>
          </div>
          <pre className="scrollbar-thin max-h-[min(70dvh,48rem)] overflow-auto rounded-xl border border-subtle bg-subtle p-4 text-xs leading-relaxed text-heading sm:text-sm">
            {formattedJson}
          </pre>
        </div>
      )}

      {showAddHours && canManageCustomHours ? (
        <AddCustomHoursModal
          defaultUserName={defaultUserName}
          onClose={() => setShowAddHours(false)}
          onAdd={handleAddCustomHours}
        />
      ) : null}
    </div>
  );
}
