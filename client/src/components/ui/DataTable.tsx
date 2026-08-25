import { useEffect, useState, type ReactNode } from 'react';
import {
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconChevronUp,
  IconSearch,
} from '../icons';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import {
  DEFAULT_PAGE_SIZE,
  PAGE_SIZE_OPTIONS,
  type PageSize,
  type SortOrder,
} from '../../types/pagination';
import { Button } from './Button';

export type DataTableColumn<T> = {
  id: string;
  header: string;
  sortable?: boolean;
  headerClassName?: string;
  cellClassName?: string;
  cell: (row: T) => ReactNode;
};

type DataTableProps<T> = {
  columns: DataTableColumn<T>[];
  data: T[];
  rowKey: (row: T) => string;
  isLoading?: boolean;
  error?: string | null;
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  page: number;
  pageSize: PageSize;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: PageSize) => void;
  sortBy: string;
  sortOrder: SortOrder;
  onSortChange: (sortBy: string, sortOrder: SortOrder) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  renderMobileRow?: (row: T) => ReactNode;
};

function SortIndicator({
  active,
  sortOrder,
}: {
  active: boolean;
  sortOrder: SortOrder;
}) {
  if (!active) {
    return <IconChevronDown width={14} height={14} className="opacity-30" />;
  }

  return sortOrder === 'asc' ? (
    <IconChevronUp width={14} height={14} className="text-emerald-500" />
  ) : (
    <IconChevronDown width={14} height={14} className="text-emerald-500" />
  );
}

function getPaginationItems(currentPage: number, totalPages: number): (number | 'ellipsis')[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set<number>([1, totalPages]);

  for (let page = currentPage - 1; page <= currentPage + 1; page += 1) {
    if (page >= 1 && page <= totalPages) {
      pages.add(page);
    }
  }

  if (currentPage <= 3) {
    pages.add(2);
    pages.add(3);
  }

  if (currentPage >= totalPages - 2) {
    pages.add(totalPages - 1);
    pages.add(totalPages - 2);
  }

  const sorted = [...pages].sort((a, b) => a - b);
  const items: (number | 'ellipsis')[] = [];

  for (let index = 0; index < sorted.length; index += 1) {
    if (index > 0 && sorted[index] - sorted[index - 1] > 1) {
      items.push('ellipsis');
    }
    items.push(sorted[index]);
  }

  return items;
}

export function DataTable<T>({
  columns,
  data,
  rowKey,
  isLoading = false,
  error = null,
  search,
  onSearchChange,
  searchPlaceholder = 'Search…',
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  sortBy,
  sortOrder,
  onSortChange,
  emptyTitle = 'No results',
  emptyDescription,
  emptyAction,
  renderMobileRow,
}: DataTableProps<T>) {
  const [searchInput, setSearchInput] = useState(search);
  const debouncedSearch = useDebouncedValue(searchInput);

  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  useEffect(() => {
    if (debouncedSearch !== search) {
      onSearchChange(debouncedSearch);
    }
  }, [debouncedSearch, onSearchChange, search]);

  const totalPages = total === 0 ? 1 : Math.ceil(total / pageSize);
  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = total === 0 ? 0 : Math.min(page * pageSize, total);
  const showEmpty = !isLoading && !error && data.length === 0;
  const showPagination = total > pageSize;
  const pageItems = getPaginationItems(page, totalPages);

  function handleSort(columnId: string) {
    if (sortBy === columnId) {
      onSortChange(columnId, sortOrder === 'asc' ? 'desc' : 'asc');
      return;
    }

    onSortChange(columnId, 'asc');
  }

  return (
    <div>
      <div className="border-b border-subtle px-4 py-4 sm:px-6">
        <label className="relative block">
          <IconSearch
            width={16}
            height={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint"
          />
          <input
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder={searchPlaceholder}
            className="input-field w-full pl-10"
          />
        </label>
      </div>

      {error && (
        <div className="border-b border-subtle px-6 py-4 text-sm text-red-500 dark:text-red-300">
          {error}
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center px-6 py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 spinner-track" />
        </div>
      )}

      {showEmpty && (
        <div className="px-6 py-16 text-center">
          <p className="text-sm font-medium text-heading">{emptyTitle}</p>
          {emptyDescription && <p className="mt-1 text-sm text-faint">{emptyDescription}</p>}
          {emptyAction && <div className="mt-6">{emptyAction}</div>}
        </div>
      )}

      {!isLoading && !showEmpty && data.length > 0 && (
        <>
          {renderMobileRow && (
            <div className="space-y-3 p-4 lg:hidden">
              {data.map((row) => (
                <div key={rowKey(row)}>{renderMobileRow(row)}</div>
              ))}
            </div>
          )}

          <div className={`table-scroll ${renderMobileRow ? 'hidden lg:block' : 'block'}`}>
            <table className="min-w-[720px] w-full text-left text-sm">
              <thead>
                <tr className="border-b border-subtle text-xs uppercase tracking-wider text-faint">
                  {columns.map((column) => (
                    <th
                      key={column.id}
                      className={`px-6 py-4 font-medium ${column.headerClassName ?? ''}`}
                    >
                      {column.sortable ? (
                        <button
                          type="button"
                          onClick={() => handleSort(column.id)}
                          className="inline-flex items-center gap-1.5 transition hover:text-heading"
                        >
                          {column.header}
                          <SortIndicator
                            active={sortBy === column.id}
                            sortOrder={sortOrder}
                          />
                        </button>
                      ) : (
                        column.header
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((row) => (
                  <tr
                    key={rowKey(row)}
                    className="border-b border-subtle table-row-hover transition"
                  >
                    {columns.map((column) => (
                      <td
                        key={column.id}
                        className={`px-6 py-4 ${column.cellClassName ?? ''}`}
                      >
                        {column.cell(row)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <div className="flex flex-col gap-4 border-t border-subtle px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
          <label className="flex items-center gap-2 text-sm text-muted">
            <span>Rows per page</span>
            <select
              value={pageSize}
              onChange={(event) => onPageSizeChange(Number(event.target.value) as PageSize)}
              className="input-field h-9 w-auto py-1"
            >
              {PAGE_SIZE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <p className="text-sm text-faint">
            {total === 0 ? 'No results' : `Showing ${rangeStart}–${rangeEnd} of ${total}`}
          </p>
        </div>

        {showPagination && (
          <div className="flex flex-wrap items-center gap-1">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1 || isLoading}
            >
              <IconChevronLeft width={16} height={16} />
              Previous
            </Button>

            {pageItems.map((item, index) =>
              item === 'ellipsis' ? (
                <span key={`ellipsis-${index}`} className="px-2 text-sm text-faint">
                  …
                </span>
              ) : (
                <button
                  key={item}
                  type="button"
                  onClick={() => onPageChange(item)}
                  disabled={isLoading}
                  className={`inline-flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-sm font-medium transition ${
                    item === page
                      ? 'bg-emerald-600 text-white'
                      : 'text-muted hover:bg-[var(--hover-bg)] hover:text-heading'
                  }`}
                >
                  {item}
                </button>
              ),
            )}

            <Button
              variant="secondary"
              size="sm"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages || isLoading}
            >
              Next
              <IconChevronRight width={16} height={16} />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS };
