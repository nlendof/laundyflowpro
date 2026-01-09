import { createContext, useContext, useState, useEffect, ReactNode, Dispatch, SetStateAction, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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

export interface TicketSettings {
  logoUrl: string;
  showLogo: boolean;
  showPrices: boolean;
  showQR: boolean;
  qrContent: 'ticket_code' | 'payment_link' | 'custom';
  customQrUrl: string;
  footerText: string;
  showFooter: boolean;
  thankYouMessage: string;
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
  
  // Ticket Settings
  ticketSettings: TicketSettings;
  setTicketSettings: Dispatch<SetStateAction<TicketSettings>>;
  
  // Loading state
  loading: boolean;
  
  // Save functions
  saveConfig: () => Promise<void>;
}

// Default data
const DEFAULT_CATEGORIES: CatalogCategory[] = [
  { id: '1', name: 'Lavado', order: 0, isActive: true },
  { id: '2', name: 'Planchado', order: 1, isActive: true },
  { id: '3', name: 'Especializado', order: 2, isActive: true },
  { id: '4', name: 'Ropa Superior', order: 3, isActive: true },
  { id: '5', name: 'Ropa Inferior', order: 4, isActive: true },
  { id: '6', name: 'Hogar', order: 5, isActive: true },
  { id: '7', name: 'Accesorios', order: 6, isActive: true },
];

const DEFAULT_OPERATIONS: OperationStep[] = [
  { id: '1', key: 'pending_pickup', name: 'Pendiente de Recogida', icon: 'Clock', color: 'bg-amber-500', isActive: true, isRequired: true, order: 0 },
  { id: '2', key: 'in_store', name: 'En Local', icon: 'Store', color: 'bg-blue-500', isActive: true, isRequired: true, order: 1 },
  { id: '3', key: 'washing', name: 'Lavando', icon: 'Waves', color: 'bg-cyan-500', isActive: true, isRequired: false, order: 2 },
  { id: '4', key: 'drying', name: 'Secando', icon: 'Wind', color: 'bg-purple-500', isActive: true, isRequired: false, order: 3 },
  { id: '5', key: 'ironing', name: 'Planchado', icon: 'Flame', color: 'bg-orange-500', isActive: true, isRequired: false, order: 4 },
  { id: '6', key: 'ready_delivery', name: 'Listo para Entrega', icon: 'Package', color: 'bg-emerald-500', isActive: true, isRequired: true, order: 5 },
  { id: '7', key: 'in_transit', name: 'En Camino', icon: 'Truck', color: 'bg-indigo-500', isActive: true, isRequired: false, order: 6 },
  { id: '8', key: 'delivered', name: 'Entregado', icon: 'CheckCircle', color: 'bg-green-600', isActive: true, isRequired: true, order: 7 },
];

const DEFAULT_ZONES: DeliveryZone[] = [
  { id: '1', name: 'Centro', price: 0, isActive: true },
  { id: '2', name: 'Zona Norte', price: 25, isActive: true },
  { id: '3', name: 'Zona Sur', price: 30, isActive: true },
  { id: '4', name: 'Zona Oriente', price: 35, isActive: true },
  { id: '5', name: 'Zona Poniente', price: 40, isActive: false },
];

const DEFAULT_EXTRAS: ExtraService[] = [
  { id: '1', name: 'Desmanchado', price: 3.00, isActive: true },
  { id: '2', name: 'Suavizante Premium', price: 2.00, isActive: true },
  { id: '3', name: 'Express (24h)', price: 10.00, isActive: true },
  { id: '4', name: 'Fragancia Especial', price: 1.50, isActive: true },
  { id: '5', name: 'Planchado Premium', price: 5.00, isActive: true },
];

const DEFAULT_PAYMENTS: PaymentMethod[] = [
  { id: '1', name: 'Efectivo', isActive: true, commission: 0 },
  { id: '2', name: 'Tarjeta de Crédito', isActive: true, commission: 3.5 },
  { id: '3', name: 'Tarjeta de Débito', isActive: true, commission: 2.5 },
  { id: '4', name: 'Transferencia', isActive: true, commission: 0 },
  { id: '5', name: 'PayPal', isActive: false, commission: 4.0 },
];

const DEFAULT_BUSINESS: BusinessSettings = {
  name: 'Luis Cap',
  slogan: 'Lavandería Profesional',
  phone: '+1 809 123 4567',
  email: 'contacto@luiscap.com',
  address: 'Av. Principal #123, Sector Centro',
  website: 'www.luiscap.com',
  openTime: '08:00',
  closeTime: '20:00',
  workDays: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],
  taxRate: 18,
  currency: 'DOP',
};

const DEFAULT_TICKET_SETTINGS: TicketSettings = {
  logoUrl: '',
  showLogo: false,
  showPrices: true,
  showQR: true,
  qrContent: 'ticket_code',
  customQrUrl: '',
  footerText: 'Conserve este ticket para recoger su pedido',
  showFooter: true,
  thankYouMessage: '¡Gracias por su preferencia!',
};

const ConfigContext = createContext<ConfigContextType | undefined>(undefined);

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [categories, setCategories] = useState<CatalogCategory[]>(DEFAULT_CATEGORIES);
  const [operations, setOperations] = useState<OperationStep[]>(DEFAULT_OPERATIONS);
  const [deliveryZones, setDeliveryZones] = useState<DeliveryZone[]>(DEFAULT_ZONES);
  const [extraServices, setExtraServices] = useState<ExtraService[]>(DEFAULT_EXTRAS);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>(DEFAULT_PAYMENTS);
  const [business, setBusiness] = useState<BusinessSettings>(DEFAULT_BUSINESS);
  const [ticketSettings, setTicketSettings] = useState<TicketSettings>(DEFAULT_TICKET_SETTINGS);
  const [loading, setLoading] = useState(true);

  // Load config from database
  const loadConfig = useCallback(async () => {
    try {
      setLoading(true);
      
      // Check if user is authenticated first
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        // Use defaults when not authenticated
        return;
      }

      const { data, error } = await supabase
        .from('system_config')
        .select('*');

      if (error) {
        // If permission denied, just use defaults
        if (error.code === '42501' || error.message?.includes('permission')) {
          console.log('Config: Using defaults (no permission)');
          return;
        }
        throw error;
      }

      if (data && data.length > 0) {
        data.forEach(config => {
          const value = config.value as Record<string, unknown>;
          switch (config.key) {
            case 'categories':
              if (Array.isArray(value)) setCategories(value as CatalogCategory[]);
              break;
            case 'operations':
              if (Array.isArray(value)) setOperations(value as OperationStep[]);
              break;
            case 'delivery_zones':
              if (Array.isArray(value)) setDeliveryZones(value as DeliveryZone[]);
              break;
            case 'extra_services':
              if (Array.isArray(value)) setExtraServices(value as ExtraService[]);
              break;
            case 'payment_methods':
              if (Array.isArray(value)) setPaymentMethods(value as PaymentMethod[]);
              break;
            case 'business':
              if (typeof value === 'object' && value !== null) {
                setBusiness({ ...DEFAULT_BUSINESS, ...value } as BusinessSettings);
              }
              break;
            case 'ticket_settings':
              if (typeof value === 'object' && value !== null) {
                setTicketSettings({ ...DEFAULT_TICKET_SETTINGS, ...value } as TicketSettings);
              }
              break;
          }
        });
      }
    } catch (error) {
      console.error('Error loading config:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Save config to database
  const saveConfig = useCallback(async () => {
    try {
      // Check if user is authenticated
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        toast.error('Debes iniciar sesión para guardar la configuración');
        return;
      }

      const configs = [
        { key: 'categories', value: categories as unknown },
        { key: 'operations', value: operations as unknown },
        { key: 'delivery_zones', value: deliveryZones as unknown },
        { key: 'extra_services', value: extraServices as unknown },
        { key: 'payment_methods', value: paymentMethods as unknown },
        { key: 'business', value: business as unknown },
        { key: 'ticket_settings', value: ticketSettings as unknown },
      ];

      for (const config of configs) {
        // First try to update existing
        const { data: existing } = await supabase
          .from('system_config')
          .select('id')
          .eq('key', config.key)
          .single();

        if (existing) {
          const { error } = await supabase
            .from('system_config')
            .update({ value: JSON.parse(JSON.stringify(config.value)), updated_at: new Date().toISOString() })
            .eq('key', config.key);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('system_config')
            .insert([{ key: config.key, value: JSON.parse(JSON.stringify(config.value)) }]);
          if (error) throw error;
        }
      }

      toast.success('Configuración guardada');
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error('Error al guardar la configuración');
    }
  }, [categories, operations, deliveryZones, extraServices, paymentMethods, business, ticketSettings]);

  // Load on mount
  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

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
        ticketSettings,
        setTicketSettings,
        loading,
        saveConfig,
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
