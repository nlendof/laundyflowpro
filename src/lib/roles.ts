/**
 * SaaS Role Architecture - Centralized Role Configuration
 * 
 * This file defines the standardized SaaS role hierarchy for the laundry management system.
 * All role-related constants and utilities should be imported from here.
 * 
 * HIERARCHY:
 * - Platform Level: owner, technician (full system access)
 * - Tenant Level: admin (laundry-wide access)
 * - Branch Level: cajero, operador, delivery (branch-specific access)
 */

import { Crown, Wrench, Shield, Building2, Calculator, Settings, Truck, User } from 'lucide-react';

// Database role type - matches app_role enum in Supabase
export type AppRole = 'owner' | 'technician' | 'admin' | 'cajero' | 'operador' | 'delivery' | 'cliente';

// SaaS hierarchy levels for documentation and UI grouping
export type RoleLevel = 'platform' | 'tenant' | 'branch' | 'customer';

export interface RoleConfig {
  // Display labels
  label: string;
  labelEs: string;
  description: string;
  
  // SaaS categorization
  level: RoleLevel;
  saasLabel: string; // Standardized SaaS terminology
  
  // UI styling
  color: string;
  bgColor: string;
  icon: typeof Crown;
  
  // Access scope
  canAccessAllLaundries: boolean;
  canAccessAllBranches: boolean;
  canManageSubscriptions: boolean;
  canManageEmployees: boolean;
}

/**
 * Comprehensive role configuration following SaaS best practices
 * 
 * MAPPING FROM CURRENT TO SAAS STANDARD:
 * - owner → Platform Owner
 * - technician → Platform Admin  
 * - admin (no branch) → Tenant Admin
 * - admin (with branch) → Branch Manager
 * - cajero → Cashier
 * - operador → Operator
 * - delivery → Courier
 * - cliente → Customer
 */
export const SAAS_ROLE_CONFIG: Record<AppRole, RoleConfig> = {
  owner: {
    label: 'Owner',
    labelEs: 'Propietario',
    description: 'Propietario de la plataforma con acceso total al sistema',
    level: 'platform',
    saasLabel: 'Platform Owner',
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
    icon: Crown,
    canAccessAllLaundries: true,
    canAccessAllBranches: true,
    canManageSubscriptions: true,
    canManageEmployees: true,
  },
  technician: {
    label: 'Technician',
    labelEs: 'Técnico',
    description: 'Administrador de plataforma con acceso técnico y de soporte',
    level: 'platform',
    saasLabel: 'Platform Admin',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    icon: Wrench,
    canAccessAllLaundries: true,
    canAccessAllBranches: true,
    canManageSubscriptions: true,
    canManageEmployees: true,
  },
  admin: {
    label: 'Administrator',
    labelEs: 'Administrador',
    description: 'Administrador de lavandería o sucursal específica',
    level: 'tenant', // Can be tenant or branch level depending on branch_id
    saasLabel: 'Tenant Admin / Branch Manager',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    icon: Shield,
    canAccessAllLaundries: false,
    canAccessAllBranches: false, // Depends on branch_id assignment
    canManageSubscriptions: false,
    canManageEmployees: true,
  },
  cajero: {
    label: 'Cashier',
    labelEs: 'Cajero',
    description: 'Gestión de caja, ventas y cobros en sucursal',
    level: 'branch',
    saasLabel: 'Cashier',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    icon: Calculator,
    canAccessAllLaundries: false,
    canAccessAllBranches: false,
    canManageSubscriptions: false,
    canManageEmployees: false,
  },
  operador: {
    label: 'Operator',
    labelEs: 'Operador',
    description: 'Operaciones de lavado y procesamiento de pedidos',
    level: 'branch',
    saasLabel: 'Operator',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
    icon: Settings,
    canAccessAllLaundries: false,
    canAccessAllBranches: false,
    canManageSubscriptions: false,
    canManageEmployees: false,
  },
  delivery: {
    label: 'Delivery',
    labelEs: 'Repartidor',
    description: 'Recogidas y entregas a domicilio',
    level: 'branch',
    saasLabel: 'Courier',
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-100',
    icon: Truck,
    canAccessAllLaundries: false,
    canAccessAllBranches: false,
    canManageSubscriptions: false,
    canManageEmployees: false,
  },
  cliente: {
    label: 'Customer',
    labelEs: 'Cliente',
    description: 'Cliente del servicio de lavandería',
    level: 'customer',
    saasLabel: 'Customer',
    color: 'text-muted-foreground',
    bgColor: 'bg-muted',
    icon: User,
    canAccessAllLaundries: false,
    canAccessAllBranches: false,
    canManageSubscriptions: false,
    canManageEmployees: false,
  },
};

/**
 * Role priority for multi-role resolution
 * Higher index = higher priority
 */
export const ROLE_PRIORITY: AppRole[] = [
  'cliente',
  'delivery',
  'operador', 
  'cajero',
  'admin',
  'technician',
  'owner',
];

/**
 * Default permissions by role
 * Used as fallback when user_permissions table is empty
 */
export const DEFAULT_PERMISSIONS_BY_ROLE: Record<AppRole, string[]> = {
  owner: ['dashboard', 'pos', 'orders', 'operations', 'deliveries', 'cash_register', 'inventory', 'catalog', 'reports', 'employees', 'customers', 'settings', 'owner_panel', 'audit'],
  technician: ['dashboard', 'pos', 'orders', 'operations', 'deliveries', 'cash_register', 'inventory', 'catalog', 'reports', 'employees', 'customers', 'settings', 'owner_panel', 'audit'],
  admin: ['dashboard', 'pos', 'orders', 'operations', 'deliveries', 'cash_register', 'inventory', 'catalog', 'reports', 'employees', 'customers', 'settings'],
  cajero: ['dashboard', 'pos', 'orders', 'cash_register', 'customers'],
  operador: ['dashboard', 'orders', 'operations', 'inventory'],
  delivery: ['dashboard', 'deliveries'],
  cliente: ['customer_portal'],
};

/**
 * Get roles grouped by level for UI display
 */
export function getRolesByLevel(): Record<RoleLevel, AppRole[]> {
  return {
    platform: ['owner', 'technician'],
    tenant: ['admin'],
    branch: ['cajero', 'operador', 'delivery'],
    customer: ['cliente'],
  };
}

/**
 * Check if a role is platform-level (owner/technician)
 */
export function isPlatformRole(role: AppRole): boolean {
  return SAAS_ROLE_CONFIG[role].level === 'platform';
}

/**
 * Check if a role can manage a specific laundry
 */
export function canManageLaundry(role: AppRole, hasLaundryAssignment: boolean): boolean {
  if (isPlatformRole(role)) return true;
  return role === 'admin' && hasLaundryAssignment;
}

/**
 * Get the highest priority role from a list
 */
export function pickHighestRole(roles: AppRole[]): AppRole | null {
  if (!roles.length) return null;
  
  let highest: AppRole | null = null;
  let highestPriority = -1;
  
  for (const role of roles) {
    const priority = ROLE_PRIORITY.indexOf(role);
    if (priority > highestPriority) {
      highestPriority = priority;
      highest = role;
    }
  }
  
  return highest;
}

/**
 * Get role display info
 */
export function getRoleDisplayInfo(role: AppRole) {
  return SAAS_ROLE_CONFIG[role];
}

/**
 * Validate if a delivery user has required laundry assignment
 */
export function validateDeliveryLaundryAssignment(role: AppRole, laundryId: string | null): {
  isValid: boolean;
  message?: string;
} {
  if (role === 'delivery' && !laundryId) {
    return {
      isValid: false,
      message: 'Los repartidores deben estar asignados a una lavandería para garantizar el aislamiento de datos',
    };
  }
  return { isValid: true };
}
