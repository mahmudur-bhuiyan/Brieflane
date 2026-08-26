import { decryptSecret } from '../credentials-crypto.js';
import { prisma } from '../prisma.js';
import type { ActiveCollabCredentials } from '../../schemas/activecollab.js';

export async function getStoredActiveCollabCredentials(
  userId: string,
): Promise<ActiveCollabCredentials | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      acUsername: true,
      acPasswordEncrypted: true,
    },
  });

  if (!user?.acUsername?.trim() || !user.acPasswordEncrypted) {
    return null;
  }

  return {
    username: user.acUsername.trim(),
    password: decryptSecret(user.acPasswordEncrypted),
  };
}
