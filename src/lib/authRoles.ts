import type { Screen, UserRole } from '../types';

export const PLATFORM_ROLES = [
  'customer',
  'business_user',
  'growth_partner',
] as const satisfies readonly UserRole[];

export type PlatformRole = (typeof PLATFORM_ROLES)[number];

export const PLATFORM_ROLE_LABELS: Record<PlatformRole, string> = {
  customer: 'Customer',
  business_user: 'Shop Owner',
  growth_partner: 'Growth Partner',
};

export function isPlatformRole(value: string | null | undefined): value is PlatformRole {
  return PLATFORM_ROLES.includes(value as PlatformRole);
}

export function roleLabel(value: string | null | undefined): string {
  if (isPlatformRole(value)) return PLATFORM_ROLE_LABELS[value];
  if (!value) return 'Unassigned';
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function dashboardScreenForRole(role: PlatformRole): Screen {
  if (role === 'business_user') return 'owner-dashboard';
  if (role === 'growth_partner') return 'gp-dashboard';
  return 'home';
}
