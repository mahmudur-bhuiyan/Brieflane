import type { UserRole } from '../types/auth';

export function isSuperAdmin(role: UserRole | undefined): boolean {
  return role === 'SUPER_ADMIN';
}

export function formatRole(role: UserRole): string {
  return role === 'SUPER_ADMIN' ? 'Super Admin' : 'Project Manager';
}
