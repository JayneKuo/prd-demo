import type { Role } from '@/lib/tenant-context';

export type Capability =
  | 'overview:read'
  | 'tasks:read'
  | 'orders:read'
  | 'orders:write'
  | 'customers:read'
  | 'inventory:read'
  | 'inventory:write'
  | 'procurement:read'
  | 'procurement:write'
  | 'finance:read'
  | 'finance:write'
  | 'reports:read'
  | 'apps:read'
  | 'apps:manage'
  | 'developer:read'
  | 'settings:read'
  | 'settings:write'
  | 'access:manage'
  | 'messages:read'
  | 'audit:read'
  | 'tickets:read'
  | 'tickets:write'
  | 'data:import'
  | 'data:export'
  | 'help:read';

const allCapabilities: Capability[] = [
  'overview:read',
  'tasks:read',
  'orders:read',
  'orders:write',
  'customers:read',
  'inventory:read',
  'inventory:write',
  'procurement:read',
  'procurement:write',
  'finance:read',
  'finance:write',
  'reports:read',
  'apps:read',
  'apps:manage',
  'developer:read',
  'settings:read',
  'settings:write',
  'access:manage',
  'messages:read',
  'audit:read',
  'tickets:read',
  'tickets:write',
  'data:import',
  'data:export',
  'help:read'
];

const roleCapabilities: Record<Role, Capability[]> = {
  owner: allCapabilities,
  admin: allCapabilities,
  operations: [
    'overview:read',
    'tasks:read',
    'orders:read',
    'orders:write',
    'customers:read',
    'inventory:read',
    'inventory:write',
    'procurement:read',
    'procurement:write',
    'reports:read',
    'messages:read',
    'audit:read',
    'tickets:read',
    'tickets:write',
    'data:import',
    'data:export',
    'help:read'
  ],
  finance: [
    'overview:read',
    'tasks:read',
    'orders:read',
    'customers:read',
    'finance:read',
    'finance:write',
    'reports:read',
    'messages:read',
    'audit:read',
    'data:export',
    'help:read'
  ],
  analyst: [
    'overview:read',
    'tasks:read',
    'orders:read',
    'customers:read',
    'inventory:read',
    'procurement:read',
    'finance:read',
    'reports:read',
    'messages:read',
    'data:export',
    'help:read'
  ],
  developer: [
    'overview:read',
    'apps:read',
    'apps:manage',
    'developer:read',
    'settings:read',
    'messages:read',
    'help:read'
  ]
};

export function hasCapability(role: Role, capability: Capability) {
  return roleCapabilities[role].includes(capability);
}

export function hasAnyCapability(role: Role, capabilities: Capability[]) {
  return capabilities.some((capability) => hasCapability(role, capability));
}
