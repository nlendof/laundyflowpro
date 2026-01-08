import { createContext, useContext, useState, ReactNode, Dispatch, SetStateAction } from 'react';

// Types for catalog items
export type CatalogItemType = 'service' | 'article';
export type PricingType = 'weight' | 'piece' | 'fixed';

export interface CatalogExtra {
  id: string;
  name: string;
  price: number;
}

export interface CatalogItem {
  id: string;
  name: string;
  description?: string;
  type: CatalogItemType;
  pricingType: PricingType;
  price: number;
  category: string;
  estimatedTime?: number; // in hours
  isActive: boolean;
  extras?: CatalogExtra[];
  // For articles that need inventory tracking
  trackInventory?: boolean;
  inventoryItemId?: string;
  createdAt: Date;
}

// Initial mock data
const INITIAL_CATALOG: CatalogItem[] = [
  {
    id: '1',
    name: 'Lavado por Kilo',
    description: 'Servicio de lavado estándar por kilogramo',
    type: 'service',
    pricingType: 'weight',
    price: 35.00,
    category: 'Lavado',
    estimatedTime: 24,
    isActive: true,
    extras: [
      { id: 'e1', name: 'Suavizante Premium', price: 10 },
      { id: 'e2', name: 'Aromatizante', price: 8 },
    ],
    createdAt: new Date('2024-01-01'),
  },
  {
    id: '2',
    name: 'Lavado Express',
    description: 'Lavado con entrega en 4 horas',
    type: 'service',
    pricingType: 'weight',
    price: 55.00,
    category: 'Lavado',
    estimatedTime: 4,
    isActive: true,
    createdAt: new Date('2024-01-01'),
  },
  {
    id: '3',
    name: 'Planchado',
    description: 'Servicio de planchado profesional',
    type: 'service',
    pricingType: 'piece',
    price: 25.00,
    category: 'Planchado',
    estimatedTime: 24,
    isActive: true,
    createdAt: new Date('2024-01-01'),
  },
  {
    id: '4',
    name: 'Lavado en Seco',
    description: 'Limpieza en seco para prendas delicadas',
    type: 'service',
    pricingType: 'piece',
    price: 85.00,
    category: 'Especializado',
    estimatedTime: 48,
    isActive: true,
    createdAt: new Date('2024-01-01'),
  },
  {
    id: '5',
    name: 'Camisa',
    description: 'Camisa de vestir o casual',
    type: 'article',
    pricingType: 'piece',
    price: 35.00,
    category: 'Ropa Superior',
    isActive: true,
    createdAt: new Date('2024-01-01'),
  },
  {
    id: '6',
    name: 'Pantalón',
    description: 'Pantalón de vestir o casual',
    type: 'article',
    pricingType: 'piece',
    price: 40.00,
    category: 'Ropa Inferior',
    isActive: true,
    createdAt: new Date('2024-01-01'),
  },
  {
    id: '7',
    name: 'Traje Completo',
    description: 'Saco y pantalón de vestir',
    type: 'article',
    pricingType: 'piece',
    price: 150.00,
    category: 'Especializado',
    isActive: true,
    createdAt: new Date('2024-01-01'),
  },
  {
    id: '8',
    name: 'Edredón Individual',
    description: 'Edredón o cobertor tamaño individual',
    type: 'article',
    pricingType: 'piece',
    price: 120.00,
    category: 'Hogar',
    isActive: true,
    createdAt: new Date('2024-01-01'),
  },
  {
    id: '9',
    name: 'Edredón Matrimonial',
    description: 'Edredón o cobertor tamaño matrimonial',
    type: 'article',
    pricingType: 'piece',
    price: 180.00,
    category: 'Hogar',
    isActive: true,
    createdAt: new Date('2024-01-01'),
  },
  {
    id: '10',
    name: 'Cortinas (por m²)',
    description: 'Lavado de cortinas por metro cuadrado',
    type: 'article',
    pricingType: 'fixed',
    price: 45.00,
    category: 'Hogar',
    isActive: true,
    createdAt: new Date('2024-01-01'),
  },
];

interface CatalogContextType {
  items: CatalogItem[];
  setItems: Dispatch<SetStateAction<CatalogItem[]>>;
  activeServices: CatalogItem[];
  activeArticles: CatalogItem[];
  activeItems: CatalogItem[];
  addItem: (item: Omit<CatalogItem, 'id' | 'createdAt'>) => void;
  updateItem: (id: string, updates: Partial<CatalogItem>) => void;
  deleteItem: (id: string) => void;
  toggleActive: (id: string) => void;
  getItemById: (id: string) => CatalogItem | undefined;
}

const CatalogContext = createContext<CatalogContextType | undefined>(undefined);

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CatalogItem[]>(INITIAL_CATALOG);

  const activeItems = items.filter(i => i.isActive);
  const activeServices = items.filter(i => i.isActive && i.type === 'service');
  const activeArticles = items.filter(i => i.isActive && i.type === 'article');

  const addItem = (itemData: Omit<CatalogItem, 'id' | 'createdAt'>) => {
    const newItem: CatalogItem = {
      ...itemData,
      id: Date.now().toString(),
      createdAt: new Date(),
    };
    setItems(prev => [...prev, newItem]);
  };

  const updateItem = (id: string, updates: Partial<CatalogItem>) => {
    setItems(prev => prev.map(i => 
      i.id === id ? { ...i, ...updates } : i
    ));
  };

  const deleteItem = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const toggleActive = (id: string) => {
    setItems(prev => prev.map(i => 
      i.id === id ? { ...i, isActive: !i.isActive } : i
    ));
  };

  const getItemById = (id: string) => items.find(i => i.id === id);

  return (
    <CatalogContext.Provider
      value={{
        items,
        setItems,
        activeServices,
        activeArticles,
        activeItems,
        addItem,
        updateItem,
        deleteItem,
        toggleActive,
        getItemById,
      }}
    >
      {children}
    </CatalogContext.Provider>
  );
}

export function useCatalog() {
  const context = useContext(CatalogContext);
  if (context === undefined) {
    throw new Error('useCatalog must be used within a CatalogProvider');
  }
  return context;
}
