// User Roles
export type UserRole = 'admin' | 'cajero' | 'operador' | 'delivery';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

// Order Status State Machine
export type OrderStatus = 
  | 'pending_pickup'      // Pendiente de Recogida
  | 'in_store'            // En Local
  | 'washing'             // Lavando
  | 'drying'              // Secando
  | 'ironing'             // Planchado
  | 'ready_delivery'      // Listo para Entrega
  | 'in_transit'          // En Camino
  | 'delivered';          // Entregado

export interface OrderStatusInfo {
  key: OrderStatus;
  label: string;
  labelEs: string;
  color: string;
  bgColor: string;
  icon: string;
}

// Order Items
export type ItemType = 'weight' | 'piece';

export interface OrderItem {
  id: string;
  name: string;
  type: ItemType;
  quantity: number;
  unitPrice: number;
  extras: string[];
}

// Orders
export interface Order {
  id: string;
  ticketCode: string;
  qrCode: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  items: OrderItem[];
  status: OrderStatus;
  totalAmount: number;
  paidAmount: number;
  isPaid: boolean;
  isDelivery: boolean;
  deliverySlot?: 'morning' | 'afternoon';
  deliveryDriverId?: string;
  createdAt: Date;
  updatedAt: Date;
  estimatedReadyAt?: Date;
  deliveredAt?: Date;
  notes?: string;
}

// Finance
export interface CashRegisterEntry {
  id: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  description: string;
  orderId?: string;
  createdAt: Date;
  createdBy: string;
}

export interface Expense {
  id: string;
  category: 'rent' | 'utilities' | 'payroll' | 'supplies' | 'other';
  amount: number;
  description: string;
  date: Date;
  createdBy: string;
}

// Inventory
export interface InventoryItem {
  id: string;
  name: string;
  category: 'detergent' | 'softener' | 'stain_remover' | 'other';
  currentStock: number;
  minStock: number;
  unit: string;
  unitCost: number;
  lastRestocked: Date;
}

// Dashboard Stats
export interface DashboardStats {
  todayOrders: number;
  todayRevenue: number;
  pendingOrders: number;
  inProcessOrders: number;
  readyForDelivery: number;
  completedToday: number;
  weeklyRevenue: number[];
  topServices: { name: string; count: number }[];
}
