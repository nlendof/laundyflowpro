import { createContext, useContext, useState, ReactNode } from 'react';
import { User, UserRole } from '@/types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string, role: UserRole) => Promise<boolean>;
  logout: () => void;
  switchRole: (role: UserRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock users for demo
const DEMO_USERS: Record<UserRole, User> = {
  admin: {
    id: '1',
    name: 'Carlos Administrador',
    email: 'admin@luiscap.com',
    role: 'admin',
  },
  cajero: {
    id: '2',
    name: 'María Cajera',
    email: 'cajero@luiscap.com',
    role: 'cajero',
  },
  operador: {
    id: '3',
    name: 'Juan Operador',
    email: 'operador@luiscap.com',
    role: 'operador',
  },
  delivery: {
    id: '4',
    name: 'Pedro Repartidor',
    email: 'delivery@luiscap.com',
    role: 'delivery',
  },
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const login = async (email: string, password: string, role: UserRole): Promise<boolean> => {
    // Demo login - in production this would call Supabase
    await new Promise(resolve => setTimeout(resolve, 800));
    
    if (password === 'demo123') {
      setUser(DEMO_USERS[role]);
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
  };

  const switchRole = (role: UserRole) => {
    setUser(DEMO_USERS[role]);
  };

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        isAuthenticated: !!user, 
        login, 
        logout,
        switchRole 
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
