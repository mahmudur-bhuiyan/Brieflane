export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;
export type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];
export const DEFAULT_PAGE_SIZE: PageSize = 20;

export type SortOrder = 'asc' | 'desc';

export type PaginationMeta = {
  page: number;
  pageSize: PageSize;
  total: number;
  totalPages: number;
};

export type TableQueryParams = {
  search: string;
  page: number;
  pageSize: PageSize;
  sortBy: string;
  sortOrder: SortOrder;
};
