import React, { createContext, useContext, useState, useCallback } from 'react';

interface NewOrdersContextType {
  newOrderCount: number;
  incrementCount: () => void;
  clearCount: () => void;
}

const NewOrdersContext = createContext<NewOrdersContextType | undefined>(undefined);

export function NewOrdersProvider({ children }: { children: React.ReactNode }) {
  const [newOrderCount, setNewOrderCount] = useState(0);

  const incrementCount = useCallback(() => {
    setNewOrderCount(prev => prev + 1);
  }, []);

  const clearCount = useCallback(() => {
    setNewOrderCount(0);
  }, []);

  return (
    <NewOrdersContext.Provider value={{ newOrderCount, incrementCount, clearCount }}>
      {children}
    </NewOrdersContext.Provider>
  );
}

export function useNewOrders() {
  const context = useContext(NewOrdersContext);
  if (!context) {
    throw new Error('useNewOrders must be used within a NewOrdersProvider');
  }
  return context;
}
