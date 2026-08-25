export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;
export type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];
export const DEFAULT_PAGE_SIZE: PageSize = 20;

export type PaginationMeta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type ParsedPagination = {
  page: number;
  pageSize: PageSize;
  skip: number;
};

export function parsePageSize(value: unknown): PageSize {
  const parsed = Number.parseInt(String(value ?? DEFAULT_PAGE_SIZE), 10);

  if (PAGE_SIZE_OPTIONS.includes(parsed as PageSize)) {
    return parsed as PageSize;
  }

  return DEFAULT_PAGE_SIZE;
}

export function parsePagination(query: Record<string, unknown>): ParsedPagination {
  const page = Math.max(1, Number.parseInt(String(query.page ?? '1'), 10) || 1);
  const pageSize = parsePageSize(query.pageSize);

  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
  };
}

export function parseSort<T extends string>(
  query: Record<string, unknown>,
  allowed: readonly T[],
  defaultSort: T,
  defaultOrder: 'asc' | 'desc' = 'desc',
): { sortBy: T; sortOrder: 'asc' | 'desc' } {
  const sortBy =
    typeof query.sortBy === 'string' && allowed.includes(query.sortBy as T)
      ? (query.sortBy as T)
      : defaultSort;

  const sortOrder =
    query.sortOrder === 'asc' || query.sortOrder === 'desc' ? query.sortOrder : defaultOrder;

  return { sortBy, sortOrder };
}

export function buildPaginationMeta(
  page: number,
  pageSize: number,
  total: number,
): PaginationMeta {
  return {
    page,
    pageSize,
    total,
    totalPages: total === 0 ? 1 : Math.ceil(total / pageSize),
  };
}
