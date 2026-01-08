import { createContext, useContext, useState, ReactNode, Dispatch, SetStateAction, useMemo } from 'react';
import { InventoryItem } from '@/types';

// Mock inventory data
const INITIAL_INVENTORY: InventoryItem[] = [
  {
    id: '1',
    name: 'Detergente Industrial',
    category: 'detergent',
    currentStock: 45,
    minStock: 20,
    unit: 'litros',
    unitCost: 85.50,
    lastRestocked: new Date('2024-01-10'),
  },
  {
    id: '2',
    name: 'Suavizante Premium',
    category: 'softener',
    currentStock: 12,
    minStock: 15,
    unit: 'litros',
    unitCost: 120.00,
    lastRestocked: new Date('2024-01-08'),
  },
  {
    id: '3',
    name: 'Quitamanchas Profesional',
    category: 'stain_remover',
    currentStock: 8,
    minStock: 10,
    unit: 'litros',
    unitCost: 95.00,
    lastRestocked: new Date('2024-01-05'),
  },
  {
    id: '4',
    name: 'Bolsas para Entrega (Grande)',
    category: 'other',
    currentStock: 250,
    minStock: 100,
    unit: 'unidades',
    unitCost: 2.50,
    lastRestocked: new Date('2024-01-12'),
  },
  {
    id: '5',
    name: 'Bolsas para Entrega (Mediana)',
    category: 'other',
    currentStock: 180,
    minStock: 100,
    unit: 'unidades',
    unitCost: 1.80,
    lastRestocked: new Date('2024-01-12'),
  },
  {
    id: '6',
    name: 'Perchas Plásticas',
    category: 'other',
    currentStock: 45,
    minStock: 50,
    unit: 'unidades',
    unitCost: 8.00,
    lastRestocked: new Date('2024-01-03'),
  },
  {
    id: '7',
    name: 'Blanqueador',
    category: 'detergent',
    currentStock: 30,
    minStock: 15,
    unit: 'litros',
    unitCost: 45.00,
    lastRestocked: new Date('2024-01-09'),
  },
  {
    id: '8',
    name: 'Almidón en Spray',
    category: 'other',
    currentStock: 5,
    minStock: 12,
    unit: 'unidades',
    unitCost: 65.00,
    lastRestocked: new Date('2024-01-02'),
  },
];

interface InventoryStats {
  totalItems: number;
  lowStockCount: number;
  criticalCount: number;
  totalValue: number;
  healthyItems: number;
}

interface InventoryContextType {
  items: InventoryItem[];
  setItems: Dispatch<SetStateAction<InventoryItem[]>>;
  stats: InventoryStats;
  addItem: (item: Omit<InventoryItem, 'id' | 'lastRestocked'>) => void;
  updateItem: (id: string, updates: Partial<InventoryItem>) => void;
  deleteItem: (id: string) => void;
  restockItem: (id: string, amount: number) => void;
  deductStock: (id: string, amount: number) => boolean;
  getItemById: (id: string) => InventoryItem | undefined;
  getLowStockItems: () => InventoryItem[];
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

export function InventoryProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<InventoryItem[]>(INITIAL_INVENTORY);

  const stats = useMemo<InventoryStats>(() => {
    const lowStockItems = items.filter(i => i.currentStock < i.minStock);
    const totalValue = items.reduce((sum, i) => sum + (i.currentStock * i.unitCost), 0);
    const criticalItems = items.filter(i => i.currentStock < i.minStock * 0.5);
    
    return {
      totalItems: items.length,
      lowStockCount: lowStockItems.length,
      criticalCount: criticalItems.length,
      totalValue,
      healthyItems: items.length - lowStockItems.length,
    };
  }, [items]);

  const addItem = (itemData: Omit<InventoryItem, 'id' | 'lastRestocked'>) => {
    const newItem: InventoryItem = {
      ...itemData,
      id: Date.now().toString(),
      lastRestocked: new Date(),
    };
    setItems(prev => [...prev, newItem]);
  };

  const updateItem = (id: string, updates: Partial<InventoryItem>) => {
    setItems(prev => prev.map(i => 
      i.id === id ? { ...i, ...updates } : i
    ));
  };

  const deleteItem = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const restockItem = (id: string, amount: number) => {
    setItems(prev => prev.map(i => 
      i.id === id 
        ? { ...i, currentStock: i.currentStock + amount, lastRestocked: new Date() }
        : i
    ));
  };

  const deductStock = (id: string, amount: number): boolean => {
    const item = items.find(i => i.id === id);
    if (!item || item.currentStock < amount) {
      return false;
    }
    
    setItems(prev => prev.map(i => 
      i.id === id 
        ? { ...i, currentStock: i.currentStock - amount }
        : i
    ));
    return true;
  };

  const getItemById = (id: string) => items.find(i => i.id === id);

  const getLowStockItems = () => items.filter(i => i.currentStock < i.minStock);

  return (
    <InventoryContext.Provider
      value={{
        items,
        setItems,
        stats,
        addItem,
        updateItem,
        deleteItem,
        restockItem,
        deductStock,
        getItemById,
        getLowStockItems,
      }}
    >
      {children}
    </InventoryContext.Provider>
  );
}

export function useInventory() {
  const context = useContext(InventoryContext);
  if (context === undefined) {
    throw new Error('useInventory must be used within a InventoryProvider');
  }
  return context;
}
