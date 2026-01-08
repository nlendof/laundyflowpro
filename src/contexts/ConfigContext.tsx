import { createContext, useContext, useState, ReactNode, Dispatch, SetStateAction } from 'react';

// Types
export interface CatalogCategory {
  id: string;
  name: string;
  order: number;
  isActive: boolean;
}

export interface OperationStep {
  id: string;
  key: string;
  name: string;
  icon: string;
  color: string;
  isActive: boolean;
  isRequired: boolean;
  order: number;
}

export interface DeliveryZone {
  id: string;
  name: string;
  price: number;
  isActive: boolean;
}

export interface ExtraService {
  id: string;
  name: string;
  price: number;
  isActive: boolean;
}

export interface PaymentMethod {
  id: string;
  name: string;
  isActive: boolean;
  commission: number;
}

export interface BusinessSettings {
  name: string;
  slogan: string;
  phone: string;
  email: string;
  address: string;
  website: string;
  openTime: string;
  closeTime: string;
  workDays: string[];
  taxRate: number;
  currency: string;
}

interface ConfigContextType {
  // Categories
  categories: CatalogCategory[];
  setCategories: Dispatch<SetStateAction<CatalogCategory[]>>;
  activeCategories: CatalogCategory[];
  
  // Operations
  operations: OperationStep[];
  setOperations: Dispatch<SetStateAction<OperationStep[]>>;
  activeOperations: OperationStep[];
  getOperationByKey: (key: string) => OperationStep | undefined;
  
  // Delivery Zones
  deliveryZones: DeliveryZone[];
  setDeliveryZones: Dispatch<SetStateAction<DeliveryZone[]>>;
  activeDeliveryZones: DeliveryZone[];
  
  // Extra Services
  extraServices: ExtraService[];
  setExtraServices: Dispatch<SetStateAction<ExtraService[]>>;
  activeExtraServices: ExtraService[];
  
  // Payment Methods
  paymentMethods: PaymentMethod[];
  setPaymentMethods: Dispatch<SetStateAction<PaymentMethod[]>>;
  activePaymentMethods: PaymentMethod[];
  
  // Business
  business: BusinessSettings;
  setBusiness: Dispatch<SetStateAction<BusinessSettings>>;
}

// Initial data
const INITIAL_CATEGORIES: CatalogCategory[] = [
  { id: '1', name: 'Lavado', order: 0, isActive: true },
  { id: '2', name: 'Planchado', order: 1, isActive: true },
  { id: '3', name: 'Especializado', order: 2, isActive: true },
  { id: '4', name: 'Ropa Superior', order: 3, isActive: true },
  { id: '5', name: 'Ropa Inferior', order: 4, isActive: true },
  { id: '6', name: 'Hogar', order: 5, isActive: true },
  { id: '7', name: 'Accesorios', order: 6, isActive: true },
];

const INITIAL_OPERATIONS: OperationStep[] = [
  { id: '1', key: 'pending_pickup', name: 'Pendiente de Recogida', icon: 'Clock', color: 'bg-amber-500', isActive: true, isRequired: true, order: 0 },
  { id: '2', key: 'in_store', name: 'En Local', icon: 'Store', color: 'bg-blue-500', isActive: true, isRequired: true, order: 1 },
  { id: '3', key: 'washing', name: 'Lavando', icon: 'Waves', color: 'bg-cyan-500', isActive: true, isRequired: false, order: 2 },
  { id: '4', key: 'drying', name: 'Secando', icon: 'Wind', color: 'bg-purple-500', isActive: true, isRequired: false, order: 3 },
  { id: '5', key: 'ironing', name: 'Planchado', icon: 'Flame', color: 'bg-orange-500', isActive: true, isRequired: false, order: 4 },
  { id: '6', key: 'ready_delivery', name: 'Listo para Entrega', icon: 'Package', color: 'bg-emerald-500', isActive: true, isRequired: true, order: 5 },
  { id: '7', key: 'in_transit', name: 'En Camino', icon: 'Truck', color: 'bg-indigo-500', isActive: true, isRequired: false, order: 6 },
  { id: '8', key: 'delivered', name: 'Entregado', icon: 'CheckCircle', color: 'bg-green-600', isActive: true, isRequired: true, order: 7 },
];

const INITIAL_ZONES: DeliveryZone[] = [
  { id: '1', name: 'Centro', price: 0, isActive: true },
  { id: '2', name: 'Zona Norte', price: 25, isActive: true },
  { id: '3', name: 'Zona Sur', price: 30, isActive: true },
  { id: '4', name: 'Zona Oriente', price: 35, isActive: true },
  { id: '5', name: 'Zona Poniente', price: 40, isActive: false },
];

const INITIAL_EXTRAS: ExtraService[] = [
  { id: '1', name: 'Desmanchado', price: 3.00, isActive: true },
  { id: '2', name: 'Suavizante Premium', price: 2.00, isActive: true },
  { id: '3', name: 'Express (24h)', price: 10.00, isActive: true },
  { id: '4', name: 'Fragancia Especial', price: 1.50, isActive: true },
  { id: '5', name: 'Planchado Premium', price: 5.00, isActive: true },
];

const INITIAL_PAYMENTS: PaymentMethod[] = [
  { id: '1', name: 'Efectivo', isActive: true, commission: 0 },
  { id: '2', name: 'Tarjeta de Crédito', isActive: true, commission: 3.5 },
  { id: '3', name: 'Tarjeta de Débito', isActive: true, commission: 2.5 },
  { id: '4', name: 'Transferencia', isActive: true, commission: 0 },
  { id: '5', name: 'PayPal', isActive: false, commission: 4.0 },
];

const INITIAL_BUSINESS: BusinessSettings = {
  name: 'Luis Cap',
  slogan: 'Lavandería Profesional',
  phone: '+52 55 1234 5678',
  email: 'contacto@luiscap.com',
  address: 'Av. Principal #123, Col. Centro',
  website: 'www.luiscap.com',
  openTime: '08:00',
  closeTime: '20:00',
  workDays: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],
  taxRate: 16,
  currency: 'MXN',
};

const ConfigContext = createContext<ConfigContextType | undefined>(undefined);

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [categories, setCategories] = useState<CatalogCategory[]>(INITIAL_CATEGORIES);
  const [operations, setOperations] = useState<OperationStep[]>(INITIAL_OPERATIONS);
  const [deliveryZones, setDeliveryZones] = useState<DeliveryZone[]>(INITIAL_ZONES);
  const [extraServices, setExtraServices] = useState<ExtraService[]>(INITIAL_EXTRAS);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>(INITIAL_PAYMENTS);
  const [business, setBusiness] = useState<BusinessSettings>(INITIAL_BUSINESS);

  // Computed values
  const activeCategories = categories
    .filter(c => c.isActive)
    .sort((a, b) => a.order - b.order);
  
  const activeOperations = operations
    .filter(o => o.isActive)
    .sort((a, b) => a.order - b.order);
  
  const activeDeliveryZones = deliveryZones.filter(z => z.isActive);
  const activeExtraServices = extraServices.filter(e => e.isActive);
  const activePaymentMethods = paymentMethods.filter(p => p.isActive);
  
  const getOperationByKey = (key: string) => operations.find(o => o.key === key);

  return (
    <ConfigContext.Provider
      value={{
        categories,
        setCategories,
        activeCategories,
        operations,
        setOperations,
        activeOperations,
        getOperationByKey,
        deliveryZones,
        setDeliveryZones,
        activeDeliveryZones,
        extraServices,
        setExtraServices,
        activeExtraServices,
        paymentMethods,
        setPaymentMethods,
        activePaymentMethods,
        business,
        setBusiness,
      }}
    >
      {children}
    </ConfigContext.Provider>
  );
}

export function useConfig() {
  const context = useContext(ConfigContext);
  if (context === undefined) {
    throw new Error('useConfig must be used within a ConfigProvider');
  }
  return context;
}
