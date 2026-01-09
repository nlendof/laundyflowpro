import { OrderStatusInfo, UserRole } from '@/types';

export const ORDER_STATUS_CONFIG: Record<string, OrderStatusInfo> = {
  pending_pickup: {
    key: 'pending_pickup',
    label: 'Pending Pickup',
    labelEs: 'Pendiente Recogida',
    color: 'text-status-pending',
    bgColor: 'bg-status-pending-bg',
    icon: 'Clock',
  },
  in_store: {
    key: 'in_store',
    label: 'In Store',
    labelEs: 'En Local',
    color: 'text-status-in-progress',
    bgColor: 'bg-status-in-progress-bg',
    icon: 'Store',
  },
  washing: {
    key: 'washing',
    label: 'Washing',
    labelEs: 'Lavando',
    color: 'text-status-washing',
    bgColor: 'bg-status-washing-bg',
    icon: 'Waves',
  },
  drying: {
    key: 'drying',
    label: 'Drying',
    labelEs: 'Secando',
    color: 'text-status-drying',
    bgColor: 'bg-status-drying-bg',
    icon: 'Wind',
  },
  ironing: {
    key: 'ironing',
    label: 'Finishing',
    labelEs: 'Terminación',
    color: 'text-status-ironing',
    bgColor: 'bg-status-ironing-bg',
    icon: 'Flame',
  },
  ready_delivery: {
    key: 'ready_delivery',
    label: 'Ready for Delivery',
    labelEs: 'Listo para Entrega',
    color: 'text-status-ready',
    bgColor: 'bg-status-ready-bg',
    icon: 'Package',
  },
  in_transit: {
    key: 'in_transit',
    label: 'In Transit',
    labelEs: 'En Camino',
    color: 'text-status-delivering',
    bgColor: 'bg-status-delivering-bg',
    icon: 'Truck',
  },
  delivered: {
    key: 'delivered',
    label: 'Delivered',
    labelEs: 'Entregado',
    color: 'text-status-delivered',
    bgColor: 'bg-status-delivered-bg',
    icon: 'CheckCircle',
  },
};

export const ORDER_STATUS_FLOW: string[] = [
  'pending_pickup',
  'in_store',
  'washing',
  'drying',
  'ironing',
  'ready_delivery',
  'in_transit',
  'delivered',
];

export const ROLE_CONFIG: Record<UserRole, { label: string; labelEs: string; color: string; icon: string }> = {
  admin: {
    label: 'Administrator',
    labelEs: 'Administrador',
    color: 'bg-role-admin',
    icon: 'Shield',
  },
  cajero: {
    label: 'Cashier',
    labelEs: 'Cajero',
    color: 'bg-role-cashier',
    icon: 'Calculator',
  },
  operador: {
    label: 'Operator',
    labelEs: 'Operador',
    color: 'bg-role-operator',
    icon: 'Settings',
  },
  delivery: {
    label: 'Delivery',
    labelEs: 'Repartidor',
    color: 'bg-role-delivery',
    icon: 'Truck',
  },
};

export const QUICK_SERVICES = [
  { id: 'wash_dry', name: 'Lavado + Secado', price: 5.00, icon: 'Waves' },
  { id: 'wash_dry_iron', name: 'Lavado + Secado + Planchado', price: 8.00, icon: 'Flame' },
  { id: 'dry_clean', name: 'Lavado en Seco', price: 12.00, icon: 'Sparkles' },
  { id: 'stain_removal', name: 'Desmanchado', price: 3.00, icon: 'Eraser' },
  { id: 'premium_softener', name: 'Suavizante Premium', price: 2.00, icon: 'Droplet' },
  { id: 'express', name: 'Servicio Express', price: 10.00, icon: 'Zap' },
];

export const EXPENSE_CATEGORIES = [
  { id: 'rent', name: 'Renta', icon: 'Home' },
  { id: 'utilities', name: 'Servicios (Luz, Agua, Gas)', icon: 'Lightbulb' },
  { id: 'payroll', name: 'Nómina', icon: 'Users' },
  { id: 'supplies', name: 'Suministros', icon: 'Package' },
  { id: 'other', name: 'Otros', icon: 'MoreHorizontal' },
];
