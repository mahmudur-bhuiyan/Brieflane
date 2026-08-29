import type { AcPagination, AcProject, AcProjectRaw } from './types.js';

function toAcProject(raw: AcProjectRaw): AcProject {
  return {
    id: raw.id,
    name: raw.name,
    isCompleted: Boolean(raw.is_completed),
    companyId: raw.company_id ?? null,
  };
}

function parsePagination(value: unknown): AcPagination | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const record = value as Record<string, unknown>;
  const currentPage = Number(record.current_page ?? record.currentPage);
  const itemsPerPage = Number(record.items_per_page ?? record.itemsPerPage);
  const totalItems = Number(record.total_items ?? record.totalItems);

  if (!Number.isFinite(currentPage) || !Number.isFinite(itemsPerPage) || !Number.isFinite(totalItems)) {
    return null;
  }

  return {
    currentPage,
    itemsPerPage,
    totalItems,
  };
}

function extractProjectRows(body: unknown): AcProjectRaw[] {
  if (Array.isArray(body)) {
    return body.filter(isAcProjectRaw);
  }

  if (!body || typeof body !== 'object') {
    return [];
  }

  const record = body as Record<string, unknown>;
  const candidates = [record.projects, record.data, record.items];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate.filter(isAcProjectRaw);
    }
  }

  return [];
}

function isAcProjectRaw(value: unknown): value is AcProjectRaw {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    typeof (value as AcProjectRaw).id === 'number' &&
    'name' in value &&
    typeof (value as AcProjectRaw).name === 'string'
  );
}

export function parseAcProjectsResponse(body: unknown): {
  projects: AcProject[];
  pagination: AcPagination | null;
} {
  const projects = extractProjectRows(body).map(toAcProject);
  const pagination =
    body && typeof body === 'object'
      ? parsePagination((body as Record<string, unknown>).pagination)
      : null;

  return { projects, pagination };
}

export function parseAcProjectResponse(body: unknown): AcProject | null {
  if (isAcProjectRaw(body)) {
    return toAcProject(body);
  }

  if (!body || typeof body !== 'object') {
    return null;
  }

  const record = body as Record<string, unknown>;
  const candidates = [record.project, record.data, record.item];

  for (const candidate of candidates) {
    if (isAcProjectRaw(candidate)) {
      return toAcProject(candidate);
    }
  }

  return null;
}

export function filterAcProjects(projects: AcProject[], search: string): AcProject[] {
  const query = search.trim().toLowerCase();

  if (!query) {
    return projects;
  }

  return projects.filter((project) => {
    const haystack = `${project.name} ${project.id}`.toLowerCase();
    return haystack.includes(query);
  });
}
