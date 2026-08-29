import type { ActiveCollabCredentials } from '../../schemas/activecollab.js';
import { getActiveCollabBaseUrl } from '../app-settings.js';
import { filterAcProjects, parseAcProjectResponse, parseAcProjectsResponse } from './projects.js';
import { ActiveCollabError, type AcProject } from './types.js';

const DEFAULT_TIMEOUT_MS = 15_000;

export type AcProjectSearchResult = {
  id: number;
  name: string;
};

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, '');
}

function getApiRoot(baseUrl: string): string {
  const normalized = normalizeBaseUrl(baseUrl);

  if (normalized.endsWith('/api/v1')) {
    return normalized;
  }

  return `${normalized}/api/v1`;
}

function basicAuthHeader(credentials: ActiveCollabCredentials): string {
  const token = Buffer.from(`${credentials.username}:${credentials.password}`).toString('base64');
  return `Basic ${token}`;
}

async function getActiveCollabApiRoot(): Promise<string> {
  const baseUrl = await getActiveCollabBaseUrl();

  if (!baseUrl) {
    throw new ActiveCollabError(
      'ActiveCollab is not configured. Set the base URL in Settings.',
      undefined,
      'config',
    );
  }

  return getApiRoot(baseUrl);
}

async function requestActiveCollab(
  credentials: ActiveCollabCredentials,
  path: string,
  init: RequestInit = {},
): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const apiRoot = await getActiveCollabApiRoot();
    const response = await fetch(`${apiRoot}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        Authorization: basicAuthHeader(credentials),
        ...(init.headers ?? {}),
      },
      signal: controller.signal,
    });

    const body = await response.json().catch(() => ({}));

    if (response.status === 401 || response.status === 403) {
      throw new ActiveCollabError(
        'ActiveCollab authentication failed. Check your credentials.',
        response.status,
        'auth',
      );
    }

    if (response.status === 404) {
      throw new ActiveCollabError('ActiveCollab project not found', response.status, 'not_found');
    }

    if (!response.ok) {
      const message =
        typeof body === 'object' &&
        body !== null &&
        'message' in body &&
        typeof (body as { message: unknown }).message === 'string'
          ? (body as { message: string }).message
          : 'ActiveCollab request failed';

      throw new ActiveCollabError(message, response.status, 'api');
    }

    return body;
  } catch (error) {
    if (error instanceof ActiveCollabError) {
      throw error;
    }

    if (error instanceof Error && error.name === 'AbortError') {
      throw new ActiveCollabError('ActiveCollab request timed out', undefined, 'timeout');
    }

    throw new ActiveCollabError(
      error instanceof Error ? error.message : 'ActiveCollab request failed',
      undefined,
      'api',
    );
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchAcProjects(
  credentials: ActiveCollabCredentials,
  params: { search?: string; page?: number } = {},
): Promise<ReturnType<typeof parseAcProjectsResponse>> {
  const searchParams = new URLSearchParams();

  if (params.page) {
    searchParams.set('page', String(params.page));
  }

  if (params.search?.trim()) {
    searchParams.set('search', params.search.trim());
  }

  const query = searchParams.toString();
  const body = await requestActiveCollab(
    credentials,
    `/projects${query ? `?${query}` : ''}`,
    { method: 'GET' },
  );

  const parsed = parseAcProjectsResponse(body);
  const projects = params.search?.trim()
    ? filterAcProjects(parsed.projects, params.search)
    : parsed.projects;

  return {
    projects,
    pagination: parsed.pagination,
  };
}

export async function fetchAcProjectById(
  credentials: ActiveCollabCredentials,
  acProjectId: number,
): Promise<AcProject> {
  const body = await requestActiveCollab(credentials, `/projects/${acProjectId}`, {
    method: 'GET',
  });

  const project = parseAcProjectResponse(body);

  if (!project) {
    throw new ActiveCollabError('ActiveCollab project not found', 404, 'not_found');
  }

  return project;
}

export async function fetchAcProjectUserTaskHours(
  credentials: ActiveCollabCredentials,
  params: { projectId: number; startDate: string; endDate: string },
): Promise<unknown> {
  return requestActiveCollab(credentials, '/ac-project-user-task-hours', {
    method: 'POST',
    body: JSON.stringify({
      project_id: params.projectId,
      start_date: params.startDate,
      end_date: params.endDate,
    }),
  });
}

function parseProjectItem(raw: unknown): AcProjectSearchResult | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const record = raw as Record<string, unknown>;
  const id = record.id ?? record.project_id ?? record.ac_project_id;
  const name = record.name ?? record.project_name;

  const numId = typeof id === 'number' ? id : Number(id);

  if (!Number.isInteger(numId) || numId <= 0) {
    return null;
  }

  if (typeof name !== 'string' || !name.trim()) {
    return null;
  }

  return { id: numId, name: name.trim() };
}

function parseSearchResponse(body: unknown): AcProjectSearchResult[] {
  if (Array.isArray(body)) {
    return body
      .map(parseProjectItem)
      .filter((project): project is AcProjectSearchResult => project !== null);
  }

  if (body && typeof body === 'object') {
    const record = body as Record<string, unknown>;
    const candidates = record.data ?? record.projects ?? record.results ?? record.items;

    if (Array.isArray(candidates)) {
      return candidates
        .map(parseProjectItem)
        .filter((project): project is AcProjectSearchResult => project !== null);
    }
  }

  return [];
}

export async function searchActiveCollabProjects(
  credentials: ActiveCollabCredentials,
  projectName: string,
): Promise<AcProjectSearchResult[]> {
  const apiRoot = await getActiveCollabApiRoot();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(`${apiRoot}/ac-get-projects`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: basicAuthHeader(credentials),
      },
      body: JSON.stringify({ project_name: projectName }),
      signal: controller.signal,
    });

    const body = await response.json().catch(() => ({}));

    if (response.status === 401 || response.status === 403) {
      throw new ActiveCollabError(
        'ActiveCollab authentication failed. Check your credentials.',
        response.status,
        'auth',
      );
    }

    if (!response.ok) {
      const message =
        typeof body === 'object' &&
        body !== null &&
        'message' in body &&
        typeof (body as { message: unknown }).message === 'string'
          ? (body as { message: string }).message
          : 'ActiveCollab project search failed';

      throw new ActiveCollabError(message, response.status, 'api');
    }

    return parseSearchResponse(body);
  } catch (error) {
    if (error instanceof ActiveCollabError) {
      throw error;
    }

    if (error instanceof Error && error.name === 'AbortError') {
      throw new ActiveCollabError('ActiveCollab request timed out', undefined, 'timeout');
    }

    throw new ActiveCollabError(
      error instanceof Error ? error.message : 'ActiveCollab project search failed',
      undefined,
      'api',
    );
  } finally {
    clearTimeout(timeout);
  }
}
