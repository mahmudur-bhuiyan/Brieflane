import type { ActiveCollabCredentials } from '../../schemas/activecollab.js';
import {
  ActiveCollabError,
  isActiveCollabError,
  type AcPagination,
  type AcProject,
  type AcProjectRaw,
} from './types.js';

const DEFAULT_TIMEOUT_MS = 15_000;
const CACHE_TTL_MS = 7 * 60 * 1000;
const CLIENT_NAME = 'Brieflane';
const CLIENT_VENDOR = 'Brieflane';

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

type ActiveCollabConfig = {
  baseUrl: string;
  credentials: ActiveCollabCredentials;
  timeoutMs?: number;
};

type IssueTokenResponse = {
  is_ok?: boolean;
  token?: string;
  message?: string;
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

function toAcProject(raw: AcProjectRaw): AcProject {
  return {
    id: raw.id,
    name: raw.name,
    isCompleted: Boolean(raw.is_completed ?? raw.completed_on),
    companyId: raw.company_id ?? null,
  };
}

function readPagination(headers: Headers): AcPagination {
  const currentPage = Number(headers.get('x-angie-paginationcurrentpage') ?? 1);
  const itemsPerPage = Number(headers.get('x-angie-paginationitemsperpage') ?? 0);
  const totalItems = Number(headers.get('x-angie-paginationtotalitems') ?? 0);

  return {
    currentPage: Number.isFinite(currentPage) ? currentPage : 1,
    itemsPerPage: Number.isFinite(itemsPerPage) ? itemsPerPage : 0,
    totalItems: Number.isFinite(totalItems) ? totalItems : 0,
  };
}

export class ActiveCollabService {
  private readonly apiRoot: string;
  private readonly credentials: ActiveCollabCredentials;
  private readonly timeoutMs: number;
  private listProjectsCache: CacheEntry<AcProject[]> | null = null;
  private apiToken: string | null = null;

  constructor(config: ActiveCollabConfig) {
    this.apiRoot = getApiRoot(config.baseUrl);
    this.credentials = config.credentials;
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  async listProjects(options?: { skipCache?: boolean }): Promise<AcProject[]> {
    if (!options?.skipCache && this.listProjectsCache && this.listProjectsCache.expiresAt > Date.now()) {
      return this.listProjectsCache.value;
    }

    const projects = await this.fetchAllProjects();

    this.listProjectsCache = {
      value: projects,
      expiresAt: Date.now() + CACHE_TTL_MS,
    };

    return projects;
  }

  async getProject(projectId: number): Promise<AcProject> {
    const data = await this.request<AcProjectRaw>(`/projects/${projectId}`);
    return toAcProject(data);
  }

  private async fetchAllProjects(): Promise<AcProject[]> {
    const all: AcProject[] = [];
    let page = 1;
    let totalItems = 0;

    while (true) {
      const { data, pagination } = await this.requestWithPagination<AcProjectRaw[]>(
        `/projects?page=${page}`,
      );

      const batch = Array.isArray(data) ? data : [];

      if (batch.length === 0) {
        break;
      }

      all.push(...batch.map(toAcProject));

      totalItems = pagination.totalItems || totalItems;

      if (totalItems > 0 && all.length >= totalItems) {
        break;
      }

      if (pagination.itemsPerPage > 0 && batch.length < pagination.itemsPerPage) {
        break;
      }

      if (pagination.totalItems === 0 && batch.length === 0) {
        break;
      }

      page = pagination.currentPage + 1;

      if (page > 500) {
        throw new ActiveCollabError('ActiveCollab pagination exceeded safety limit', undefined, 'api');
      }
    }

    return all;
  }

  private async ensureApiToken(): Promise<string> {
    if (this.apiToken) {
      return this.apiToken;
    }

    const url = `${this.apiRoot}/issue-token`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: this.credentials.username,
          password: this.credentials.password,
          client_name: CLIENT_NAME,
          client_vendor: CLIENT_VENDOR,
        }),
        signal: controller.signal,
      });

      const body = (await response.json().catch(() => ({}))) as IssueTokenResponse;

      if (response.status === 401 || response.status === 403 || !body.is_ok || !body.token) {
        throw new ActiveCollabError(
          body.message ?? 'ActiveCollab authentication failed',
          response.status,
          'auth',
        );
      }

      this.apiToken = body.token;
      return this.apiToken;
    } catch (error) {
      if (error instanceof ActiveCollabError) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new ActiveCollabError('ActiveCollab request timed out', undefined, 'timeout');
      }

      throw new ActiveCollabError(
        error instanceof Error ? error.message : 'ActiveCollab authentication failed',
        undefined,
        'auth',
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  private async request<T>(path: string): Promise<T> {
    const { data } = await this.requestWithPagination<T>(path);
    return data;
  }

  private async requestWithPagination<T>(path: string): Promise<{ data: T; pagination: AcPagination }> {
    const apiToken = await this.ensureApiToken();
    const url = `${this.apiRoot}${path.startsWith('/') ? path : `/${path}`}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'X-Angie-AuthApiToken': apiToken,
        },
        signal: controller.signal,
      });

      if (response.status === 401 || response.status === 403) {
        this.apiToken = null;
        throw new ActiveCollabError('ActiveCollab authentication failed', response.status, 'auth');
      }

      if (response.status === 404) {
        throw new ActiveCollabError('ActiveCollab resource not found', response.status, 'not_found');
      }

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new ActiveCollabError(
          body ? `ActiveCollab request failed: ${body.slice(0, 200)}` : 'ActiveCollab request failed',
          response.status,
          'api',
        );
      }

      const data = (await response.json()) as T;
      const pagination = readPagination(response.headers);

      return { data, pagination };
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
}

export { ActiveCollabError, isActiveCollabError } from './types.js';

export function createActiveCollabService(credentials: ActiveCollabCredentials): ActiveCollabService {
  const baseUrl = process.env.ACTIVECOLLAB_BASE_URL?.trim();

  if (!baseUrl) {
    throw new ActiveCollabError(
      'ActiveCollab is not configured. Set ACTIVECOLLAB_BASE_URL.',
      undefined,
      'config',
    );
  }

  return new ActiveCollabService({ baseUrl, credentials });
}
