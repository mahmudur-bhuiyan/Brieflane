export type N8nWebhookPayload = {
  reportRunId: string;
  brieflaneProjectId: string;
  acProjectId: number;
  projectName: string;
  clientEmail: string;
  reportRecipients: string[];
  customMetadata: Record<string, unknown>;
  triggeredBy: string;
};

export class N8nError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly code: 'config' | 'timeout' | 'api' = 'api',
  ) {
    super(message);
    this.name = 'N8nError';
  }
}

export function isN8nError(error: unknown): error is N8nError {
  return error instanceof N8nError;
}
