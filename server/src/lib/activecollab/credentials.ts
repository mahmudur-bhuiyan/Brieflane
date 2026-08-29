import { decryptSecret } from '../credentials-crypto.js';
import { prisma } from '../prisma.js';
import type { ActiveCollabCredentials } from '../../schemas/activecollab.js';

export class StoredCredentialsError extends Error {
  constructor(
    message = 'Stored ActiveCollab credentials could not be read. Re-save them in your profile.',
  ) {
    super(message);
    this.name = 'StoredCredentialsError';
  }
}

export function isStoredCredentialsError(error: unknown): error is StoredCredentialsError {
  return (
    error instanceof StoredCredentialsError ||
    (error instanceof Error && error.name === 'StoredCredentialsError')
  );
}

export type StoredActiveCollabCredentialsState =
  | { status: 'missing' }
  | { status: 'unreadable'; username: string }
  | { status: 'ready'; credentials: ActiveCollabCredentials };

function resolveStoredActiveCollabCredentials(user: {
  acUsername: string | null;
  acPasswordEncrypted: string | null;
}): StoredActiveCollabCredentialsState {
  if (!user.acUsername?.trim() || !user.acPasswordEncrypted) {
    return { status: 'missing' };
  }

  try {
    return {
      status: 'ready',
      credentials: {
        username: user.acUsername.trim(),
        password: decryptSecret(user.acPasswordEncrypted),
      },
    };
  } catch {
    return { status: 'unreadable', username: user.acUsername.trim() };
  }
}

export async function getStoredActiveCollabCredentialsState(
  userId: string,
): Promise<StoredActiveCollabCredentialsState> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      acUsername: true,
      acPasswordEncrypted: true,
    },
  });

  if (!user) {
    return { status: 'missing' };
  }

  return resolveStoredActiveCollabCredentials(user);
}

export async function getStoredActiveCollabCredentials(
  userId: string,
): Promise<ActiveCollabCredentials | null> {
  const state = await getStoredActiveCollabCredentialsState(userId);

  if (state.status === 'ready') {
    return state.credentials;
  }

  if (state.status === 'unreadable') {
    throw new StoredCredentialsError();
  }

  return null;
}

export function canDecryptStoredPassword(acPasswordEncrypted: string | null | undefined): boolean {
  if (!acPasswordEncrypted) {
    return false;
  }

  try {
    decryptSecret(acPasswordEncrypted);
    return true;
  } catch {
    return false;
  }
}
