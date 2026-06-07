// ============================================
// CORE TYPES
// ============================================

export type UserRole = 'admin' | 'manager' | 'staff' | 'technician';

export interface User {
  id: string;
  fullName: string;
  username: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  phone?: string;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export type ServiceStatus = 'waiting' | 'in-service' | 'ready' | 'completed' | 'cancelled';
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'partial' | 'unpaid' | 'cancelled';
export type StockCategory = 'parts' | 'oils' | 'filters' | 'tires' | 'tools' | 'supplies' | 'other';
export type AppointmentStatus = 'pending' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled' | 'no-show';

export interface Customer {
  id: string;
  fullName: string;
  email?: string;
  phone: string;
  address?: string;
  status: 'active' | 'inactive';
  totalSpent: number;
  lastVisit?: string;
  vehicleCount?: number;
  notes?: string;
  createdAt: string;
}

export interface Vehicle {
  id: string;
  customerId: string;
  customerName?: string;
  make: string;
  model: string;
  year: number;
  licensePlate: string;
  color?: string;
  vin?: string;
  mileage?: number;
  fuelType?: string;
  notes?: string;
}

export interface ServiceRecord {
  id: string;
  vehicleId: string;
  customerId: string;
  serviceName: string;
  status: ServiceStatus;
  technicianId?: string;
  technicianName?: string;
  checkedInAt: string;
  startedAt?: string;
  completedAt?: string;
  estimatedCompletion?: string;
  laborCost: number;
  partsCost: number;
  totalCost: number;
  diagnosis?: string;
  workPerformed?: string;
  // Joined fields
  make?: string;
  model?: string;
  year?: number;
  licensePlate?: string;
  customerName?: string;
  customerPhone?: string;
}

export interface Appointment {
  id: string;
  customerId: string;
  customerName?: string;
  customerPhone?: string;
  vehicleId?: string;
  make?: string;
  model?: string;
  licensePlate?: string;
  serviceDescription?: string;
  serviceTypeName?: string;
  scheduledAt: string;
  durationMinutes: number;
  status: AppointmentStatus;
  notes?: string;
}

export interface StockItem {
  id: string;
  name: string;
  sku: string;
  category: StockCategory;
  supplier?: string;
  quantity: number;
  reorderLevel: number;
  costPrice: number;
  sellingPrice: number;
  location?: string;
  status: 'in-stock' | 'low-stock' | 'out-of-stock';
  notes?: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName?: string;
  customerPhone?: string;
  make?: string;
  model?: string;
  licensePlate?: string;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  paidAmount: number;
  status: InvoiceStatus;
  dueDate?: string;
  notes?: string;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  activityType: 'repair' | 'stock' | 'customer' | 'invoice' | 'appointment' | 'user' | 'system';
  title: string;
  description?: string;
  details?: Record<string, any>;
  performedByName?: string;
  createdAt: string;
}

export interface DashboardStats {
  activeServices: number;
  todayAppointments: number;
  activeCustomers: number;
  monthlyRevenue: number;
}

// Navigation types
export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Main: undefined;
  Dashboard: undefined;
  Vehicles: undefined;
  VehicleDetail: { serviceId: string };
  AddService: { customerId?: string; vehicleId?: string };
  Appointments: undefined;
  AddAppointment: undefined;
  Customers: undefined;
  CustomerDetail: { customerId: string };
  AddCustomer: undefined;
  Stock: undefined;
  AddStockItem: undefined;
  Invoices: undefined;
  AddInvoice: { customerId?: string; serviceRecordId?: string };
  ActivityHistory: undefined;
  Settings: undefined;
  Profile: undefined;
};
