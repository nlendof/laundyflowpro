import { useAuth } from '@/hooks/useAuth';
import { ROLE_CONFIG } from '@/lib/constants';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Truck,
  DollarSign,
  BarChart3,
  Users,
  Settings,
  LogOut,
  ChevronLeft,
  WashingMachine,
  Boxes,
} from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { UserRole } from '@/types';

interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
  roles: UserRole[];
}

const navItems: NavItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard', roles: ['admin'] },
  { icon: ShoppingCart, label: 'Venta Rápida', path: '/pos', roles: ['admin', 'cajero'] },
  { icon: Package, label: 'Pedidos', path: '/orders', roles: ['admin', 'cajero', 'operador'] },
  { icon: WashingMachine, label: 'Operaciones', path: '/operations', roles: ['admin', 'operador'] },
  { icon: Truck, label: 'Entregas', path: '/deliveries', roles: ['admin', 'delivery'] },
  { icon: DollarSign, label: 'Caja', path: '/cash-register', roles: ['admin', 'cajero'] },
  { icon: Boxes, label: 'Inventario', path: '/inventory', roles: ['admin'] },
  { icon: BarChart3, label: 'Reportes', path: '/reports', roles: ['admin'] },
  { icon: Users, label: 'Empleados', path: '/employees', roles: ['admin'] },
  { icon: Settings, label: 'Configuración', path: '/settings', roles: ['admin'] },
];

export function AppSidebar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  if (!user) return null;

  const roleConfig = ROLE_CONFIG[user.role];
  const filteredNavItems = navItems.filter(item => item.roles.includes(user.role));

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen bg-sidebar text-sidebar-foreground transition-all duration-300 flex flex-col',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
        {!collapsed && (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <WashingMachine className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-sidebar-foreground">Luis Cap</h1>
              <p className="text-xs text-sidebar-foreground/60">Lavandería</p>
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="text-sidebar-foreground hover:bg-sidebar-accent"
        >
          <ChevronLeft className={cn('w-5 h-5 transition-transform', collapsed && 'rotate-180')} />
        </Button>
      </div>

      {/* User Info */}
      <div className={cn('p-4 border-b border-sidebar-border', collapsed && 'px-2')}>
        <div className={cn('flex items-center gap-3', collapsed && 'justify-center')}>
          <div className={cn('w-10 h-10 rounded-full flex items-center justify-center text-primary-foreground font-semibold', roleConfig.color)}>
            {user.name.charAt(0)}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{user.name}</p>
              <p className="text-xs text-sidebar-foreground/60">{roleConfig.labelEs}</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-2">
        <ul className="space-y-1">
          {filteredNavItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                    'hover:bg-sidebar-accent',
                    isActive && 'bg-sidebar-primary text-sidebar-primary-foreground',
                    collapsed && 'justify-center px-2'
                  )}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  {!collapsed && <span className="font-medium">{item.label}</span>}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-sidebar-border">
        <Button
          variant="ghost"
          onClick={logout}
          className={cn(
            'w-full justify-start text-sidebar-foreground hover:bg-destructive/10 hover:text-destructive',
            collapsed && 'justify-center px-2'
          )}
        >
          <LogOut className="w-5 h-5" />
          {!collapsed && <span className="ml-3">Cerrar Sesión</span>}
        </Button>
      </div>
    </aside>
  );
}
