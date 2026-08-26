import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { IconCopy } from '../../../components/common/icons';
import { Button } from '../../../components/ui/Button';
import { DataTable, type DataTableColumn } from '../../../components/ui/DataTable';
import { toast } from '../../../lib/toast';
import { DEFAULT_PAGE_SIZE, type PageSize, type SortOrder } from '../../../types/pagination';
import {
  filterTaskHoursRows,
  formatTaskHoursColumnHeader,
  parseTaskHoursTable,
  sortTaskHoursRows,
  type TaskHoursTableRow,
} from '../utils/taskHoursTable';

type TaskHoursViewTab = 'table' | 'json';

type TaskHoursResponseViewProps = {
  data: unknown;
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

export function TaskHoursResponseView({ data }: TaskHoursResponseViewProps) {
  const [activeTab, setActiveTab] = useState<TaskHoursViewTab>('table');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(DEFAULT_PAGE_SIZE);
  const [sortBy, setSortBy] = useState('');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  const formattedJson = useMemo(() => JSON.stringify(data, null, 2), [data]);
  const parsedTable = useMemo(() => parseTaskHoursTable(data), [data]);

  const filteredRows = useMemo(
    () => filterTaskHoursRows(parsedTable.rows, search),
    [parsedTable.rows, search],
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
    const columnWidth =
      parsedTable.columns.length > 0 ? Math.floor(100 / parsedTable.columns.length) : 100;

    return parsedTable.columns.map((columnKey) => {
      const leafKey = columnKey.split('.').pop() ?? columnKey;
      const isTextColumn =
        leafKey.includes('name') || leafKey.includes('summary') || leafKey.includes('email');
      const isHoursColumn =
        leafKey === 'hours' ||
        leafKey === 'value' ||
        leafKey === 'tracked_time' ||
        leafKey === 'time' ||
        leafKey === 'duration' ||
        leafKey.endsWith('_hours');

      return {
        id: columnKey,
        header: formatTaskHoursColumnHeader(columnKey),
        width: columnWidth,
        align: isTextColumn ? 'left' : isHoursColumn ? 'right' : 'center',
        sortable: true,
        cell: (row: TaskHoursTableRow) => (
          <span
            className={
              isTextColumn
                ? 'font-medium text-heading'
                : isHoursColumn
                  ? 'tabular-nums text-heading'
                  : 'text-muted'
            }
          >
            {row.values[columnKey] ?? '—'}
          </span>
        ),
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
        parsedTable.rows.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="text-sm font-medium text-heading">No table rows found</p>
            <p className="mt-1 text-sm text-faint">
              The response does not contain recognizable row data. Switch to the JSON tab to inspect
              the raw payload.
            </p>
          </div>
        ) : (
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
    </div>
  );
}
