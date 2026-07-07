import { useAuthStore } from '../store/authStore';

export type Permission =
  | 'customers.create' | 'customers.edit' | 'customers.delete' | 'customers.view'
  | 'vehicles.create' | 'vehicles.edit' | 'vehicles.delete' | 'vehicles.view'
  | 'services.create' | 'services.edit' | 'services.delete' | 'services.view' | 'services.updateStatus'
  | 'stock.create' | 'stock.edit' | 'stock.delete' | 'stock.view' | 'stock.adjust'
  | 'suppliers.create' | 'suppliers.edit' | 'suppliers.delete' | 'suppliers.view'
  | 'invoices.create' | 'invoices.edit' | 'invoices.delete' | 'invoices.view' | 'invoices.payment'
  | 'appointments.create' | 'appointments.edit' | 'appointments.delete' | 'appointments.view'
  | 'users.create' | 'users.edit' | 'users.delete' | 'users.view'
  | 'reports.view' | 'activity.view' | 'settings.edit';

const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  admin: [
    'customers.create', 'customers.edit', 'customers.delete', 'customers.view',
    'vehicles.create', 'vehicles.edit', 'vehicles.delete', 'vehicles.view',
    'services.create', 'services.edit', 'services.delete', 'services.view', 'services.updateStatus',
    'stock.create', 'stock.edit', 'stock.delete', 'stock.view', 'stock.adjust',
    'suppliers.create', 'suppliers.edit', 'suppliers.delete', 'suppliers.view',
    'invoices.create', 'invoices.edit', 'invoices.delete', 'invoices.view', 'invoices.payment',
    'appointments.create', 'appointments.edit', 'appointments.delete', 'appointments.view',
    'users.create', 'users.edit', 'users.delete', 'users.view',
    'reports.view', 'activity.view', 'settings.edit',
  ],
  manager: [
    'customers.create', 'customers.edit', 'customers.delete', 'customers.view',
    'vehicles.create', 'vehicles.edit', 'vehicles.delete', 'vehicles.view',
    'services.create', 'services.edit', 'services.delete', 'services.view', 'services.updateStatus',
    'stock.create', 'stock.edit', 'stock.delete', 'stock.view', 'stock.adjust',
    'suppliers.create', 'suppliers.edit', 'suppliers.delete', 'suppliers.view',
    'invoices.create', 'invoices.edit', 'invoices.delete', 'invoices.view', 'invoices.payment',
    'appointments.create', 'appointments.edit', 'appointments.delete', 'appointments.view',
    'users.create', 'users.edit', 'users.view',
    'reports.view', 'activity.view', 'settings.edit',
  ],
  staff: [
    'customers.create', 'customers.edit', 'customers.view',
    'vehicles.create', 'vehicles.edit', 'vehicles.view',
    'services.create', 'services.view', 'services.updateStatus',
    'stock.create', 'stock.view', 'stock.adjust',
    'suppliers.view',
    'invoices.create', 'invoices.view', 'invoices.payment',
    'appointments.create', 'appointments.edit', 'appointments.view',
    'activity.view',
  ],
  technician: [
    'customers.view',
    'vehicles.view',
    'services.view', 'services.updateStatus',
    'stock.view',
    'appointments.view',
  ],
};

export const usePermissions = () => {
  const { user } = useAuthStore();
  const role = user?.role || 'technician';
  const permissions = ROLE_PERMISSIONS[role] || [];

  const can = (permission: Permission): boolean => permissions.includes(permission);
  const canAny = (...perms: Permission[]): boolean => perms.some(p => permissions.includes(p));
  const isAdminOrManager = (): boolean => role === 'admin' || role === 'manager';
  const isAdmin = (): boolean => role === 'admin';

  return { can, canAny, isAdminOrManager, isAdmin, role };
};
