import { getN8nConfig, getN8nGmailDraftWebhookUrl } from '../app-settings.js';
import { N8nError, type N8nWebhookPayload } from './types.js';

const DEFAULT_TIMEOUT_MS = 30_000;
const SECRET_HEADER = 'X-Brieflane-Secret';

export type N8nTriggerResult = {
  statusCode: number;
  n8nExecutionId: string | null;
};

type N8nServiceConfig = {
  webhookUrl: string;
  webhookSecret: string;
  timeoutMs?: number;
};

function extractExecutionId(body: unknown): string | null {
  if (!body || typeof body !== 'object') {
    return null;
  }

  const record = body as Record<string, unknown>;

  for (const key of ['executionId', 'n8nExecutionId', 'id']) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      return String(value);
    }
  }

  return null;
}

export class N8nReportService {
  private readonly webhookUrl: string;
  private readonly webhookSecret: string;
  private readonly timeoutMs: number;

  constructor(config: N8nServiceConfig) {
    this.webhookUrl = config.webhookUrl;
    this.webhookSecret = config.webhookSecret;
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  async triggerReport(payload: N8nWebhookPayload): Promise<N8nTriggerResult> {
    return postN8nWebhook(this.webhookUrl, payload, {
      secret: this.webhookSecret,
      timeoutMs: this.timeoutMs,
    });
  }
}

export async function postN8nWebhook(
  webhookUrl: string,
  payload: unknown,
  options?: { secret?: string; timeoutMs?: number },
): Promise<N8nTriggerResult> {
  const controller = new AbortController();
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };

    if (options?.secret) {
      headers[SECRET_HEADER] = options.secret;
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    let body: unknown = null;

    try {
      body = await response.json();
    } catch {
      // n8n may return empty body on success
    }

    if (!response.ok) {
      const detail =
        body && typeof body === 'object' && 'message' in body
          ? String((body as { message: unknown }).message)
          : null;

      throw new N8nError(
        detail ?? `n8n webhook rejected the request (${response.status})`,
        response.status,
        'api',
      );
    }

    return {
      statusCode: response.status,
      n8nExecutionId: extractExecutionId(body),
    };
  } catch (error) {
    if (error instanceof N8nError) {
      throw error;
    }

    if (error instanceof Error && error.name === 'AbortError') {
      throw new N8nError('n8n webhook request timed out', undefined, 'timeout');
    }

    throw new N8nError(
      error instanceof Error ? error.message : 'n8n webhook request failed',
      undefined,
      'api',
    );
  } finally {
    clearTimeout(timeout);
  }
}

export { N8nError, isN8nError } from './types.js';

export async function getN8nReportService(): Promise<N8nReportService | null> {
  const config = await getN8nConfig();

  if (!config) {
    return null;
  }

  return new N8nReportService(config);
}

export async function requireN8nReportService(): Promise<N8nReportService> {
  const service = await getN8nReportService();

  if (!service) {
    throw new N8nError(
      'n8n is not configured. Set the webhook URL and secret in Settings.',
      undefined,
      'config',
    );
  }

  return service;
}

export async function requireN8nGmailDraftWebhookUrl(): Promise<string> {
  const webhookUrl = await getN8nGmailDraftWebhookUrl();

  if (!webhookUrl) {
    throw new N8nError(
      'Gmail draft webhook is not configured. Set the Gmail draft webhook URL in Settings.',
      undefined,
      'config',
    );
  }

  return webhookUrl;
}
