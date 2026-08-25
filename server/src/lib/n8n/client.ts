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
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          [SECRET_HEADER]: this.webhookSecret,
        },
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
}

export { N8nError, isN8nError } from './types.js';

export function getN8nReportService(): N8nReportService | null {
  const webhookUrl = process.env.N8N_REPORT_WEBHOOK_URL?.trim();
  const webhookSecret = process.env.N8N_WEBHOOK_SECRET?.trim();

  if (!webhookUrl || !webhookSecret) {
    return null;
  }

  return new N8nReportService({ webhookUrl, webhookSecret });
}

export function requireN8nReportService(): N8nReportService {
  const service = getN8nReportService();

  if (!service) {
    throw new N8nError(
      'n8n is not configured. Set N8N_REPORT_WEBHOOK_URL and N8N_WEBHOOK_SECRET.',
      undefined,
      'config',
    );
  }

  return service;
}
