import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type AppRole = 'owner' | 'technician' | 'admin' | 'cajero' | 'operador' | 'delivery' | 'cliente';

const ROLE_PRIORITY: AppRole[] = [
  'owner',
  'technician',
  'admin',
  'cajero',
  'operador',
  'delivery',
  'cliente',
];

const ALL_APP_PERMISSIONS = [
  'dashboard',
  'pos',
  'orders',
  'operations',
  'deliveries',
  'cash_register',
  'customers',
  'inventory',
  'purchases',
  'catalog',
  'reports',
  'employees',
  'audit',
  'settings',
];

const DEFAULT_PERMISSIONS_BY_ROLE: Record<AppRole, string[]> = {
  owner: ALL_APP_PERMISSIONS,
  technician: ALL_APP_PERMISSIONS,
  admin: ALL_APP_PERMISSIONS,
  cajero: ['dashboard', 'pos', 'orders', 'customers', 'cash_register'],
  operador: ['dashboard', 'orders', 'operations', 'inventory'],
  delivery: ['dashboard', 'orders', 'deliveries'],
  cliente: [],
};

function pickHighestRole(roles: unknown): AppRole | null {
  if (!Array.isArray(roles) || roles.length === 0) return null;
  const normalized = roles
    .map((r) => (typeof r === 'string' ? r : (r as any)?.role))
    .filter((r): r is string => typeof r === 'string');

  for (const role of ROLE_PRIORITY) {
    if (normalized.includes(role)) return role;
  }
  return null;
}

interface Profile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar_url?: string;
  is_active: boolean;
  hire_date?: string;
  must_change_password?: boolean;
  profile_completed?: boolean;
  laundry_id?: string;
  branch_id?: string;
}

interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: AppRole;
  avatar?: string;
  phone?: string;
  permissions: string[];
  mustChangePassword: boolean;
  profileCompleted: boolean;
  laundryId?: string;
  branchId?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserData = async (userId: string): Promise<AuthUser | null> => {
    try {
      // Fetch profile with laundry_id and branch_id
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        return null;
      }

      if (!profile) {
        console.error('No profile found for user');
        return null;
      }

      // Fetch roles (can be multiple)
      const { data: rolesData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (roleError) console.error('Error fetching role(s):', roleError);

      // Fetch permissions
      const { data: permissionsData, error: permissionsError } = await supabase
        .from('user_permissions')
        .select('module_key')
        .eq('user_id', userId);

      if (permissionsError) {
        console.error('Error fetching permissions:', permissionsError);
      }

      const roleFromDb = pickHighestRole(rolesData) as AppRole | null;
      const role = roleFromDb || 'cajero';

      // If permissions can't be loaded (RLS/network) or are empty, fall back to role defaults
      const loadedPermissions = permissionsData?.map(p => p.module_key).filter(Boolean) || [];
      const permissions = loadedPermissions.length > 0 ? loadedPermissions : DEFAULT_PERMISSIONS_BY_ROLE[role];

      return {
        id: profile.id,
        name: profile.name,
        email: profile.email,
        role,
        avatar: profile.avatar_url || undefined,
        phone: profile.phone || undefined,
        permissions,
        mustChangePassword: profile.must_change_password ?? false,
        profileCompleted: profile.profile_completed ?? true,
        laundryId: profile.laundry_id || undefined,
        branchId: profile.branch_id || undefined,
      };
    } catch (error) {
      console.error('Error in fetchUserData:', error);
      return null;
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);

        // Avoid duplicate initial load: we already call getSession() below.
        if (event === 'INITIAL_SESSION') {
          return;
        }
        
        if (session?.user) {
          // Defer data fetch to avoid deadlock
          setTimeout(() => {
            fetchUserData(session.user.id).then(userData => {
              setUser(userData);
              setIsLoading(false);
            });
          }, 0);
        } else {
          setUser(null);
          setIsLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      
      if (session?.user) {
        fetchUserData(session.user.id).then(userData => {
          setUser(userData);
          setIsLoading(false);
        });
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string): Promise<{ error: string | null }> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          return { error: 'Correo o contraseña incorrectos' };
        }
        return { error: error.message };
      }

      if (data.user) {
        // Check if user is active
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_active')
          .eq('id', data.user.id)
          .maybeSingle();

        if (profile && !profile.is_active) {
          await supabase.auth.signOut();
          return { error: 'Tu cuenta está desactivada. Contacta al administrador.' };
        }

        // Update last login
        await supabase
          .from('profiles')
          .update({ last_login: new Date().toISOString() })
          .eq('id', data.user.id);
      }

      return { error: null };
    } catch (error) {
      console.error('Login error:', error);
      return { error: 'Error al iniciar sesión. Intenta de nuevo.' };
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Error al cerrar sesión');
    }
  };

  const refreshUser = async () => {
    if (session?.user) {
      const userData = await fetchUserData(session.user.id);
      setUser(userData);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isAuthenticated: !!session && !!user,
        isLoading,
        login,
        logout,
        refreshUser,
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