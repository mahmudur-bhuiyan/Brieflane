import type { ActiveCollabCredentials } from '../../schemas/activecollab.js';
import { ActiveCollabError } from './types.js';

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
    return body.map(parseProjectItem).filter((project): project is AcProjectSearchResult => project !== null);
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
  const baseUrl = process.env.ACTIVECOLLAB_BASE_URL?.trim();

  if (!baseUrl) {
    throw new ActiveCollabError(
      'ActiveCollab is not configured. Set ACTIVECOLLAB_BASE_URL.',
      undefined,
      'config',
    );
  }

  const url = `${getApiRoot(baseUrl)}/ac-get-projects`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
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

export async function fetchAcProjectUserTaskHours(
  credentials: ActiveCollabCredentials,
  params: { projectId: number; startDate: string; endDate: string },
): Promise<unknown> {
  const baseUrl = process.env.ACTIVECOLLAB_BASE_URL?.trim();

  if (!baseUrl) {
    throw new ActiveCollabError(
      'ActiveCollab is not configured. Set ACTIVECOLLAB_BASE_URL.',
      undefined,
      'config',
    );
  }

  const url = `${getApiRoot(baseUrl)}/ac-project-user-task-hours`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: basicAuthHeader(credentials),
      },
      body: JSON.stringify({
        project_id: params.projectId,
        start_date: params.startDate,
        end_date: params.endDate,
      }),
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
          : 'ActiveCollab task hours request failed';

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
      error instanceof Error ? error.message : 'ActiveCollab task hours request failed',
      undefined,
      'api',
    );
  } finally {
    clearTimeout(timeout);
  }
}
