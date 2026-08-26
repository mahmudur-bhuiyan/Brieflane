export type ProjectStatus = 'ACTIVE' | 'ARCHIVED';

export type ProjectRecord = {
  id: string;
  acProjectId: number;
  name: string;
  clientName: string | null;
  clientEmail: string | null;
  reportRecipients: string[];
  customMetadata: Record<string, unknown>;
  status: ProjectStatus;
  lastSyncedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProjectsListResponse = {
  projects: ProjectRecord[];
  count: number;
};

export type ProjectResponse = {
  project: ProjectRecord;
};

export type SyncProjectsResponse = {
  synced: number;
  created: number;
  updated: number;
};

export type ActiveCollabCredentials = {
  username: string;
  password: string;
};

export type AcProjectSearchResult = {
  id: number;
  name: string;
};

export type SearchAcProjectsInput = ActiveCollabCredentials & {
  projectName: string;
};

export type SearchAcProjectsResponse = {
  projects: AcProjectSearchResult[];
  count: number;
};

export type CreateProjectInput = {
  acProjectId: number;
  name: string;
  clientName?: string;
  clientEmail?: string;
  reportRecipients?: string[];
  customMetadata?: Record<string, unknown>;
};

export type UpdateProjectInput = {
  name?: string;
  clientName?: string | null;
  clientEmail?: string | null;
  reportRecipients?: string[];
  customMetadata?: Record<string, unknown>;
  status?: ProjectStatus;
};
