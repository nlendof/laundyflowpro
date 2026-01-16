import { useAuth } from '@/hooks/useAuth';
import { useNewOrders } from '@/contexts/NewOrdersContext';
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
  Tag,
  UserCircle,
  ShoppingBag,
  FileText,
  User,
  RotateCcw,
  Crown,
} from 'lucide-react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';


interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
  permissionKey: string;
}

const navItems: NavItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard', permissionKey: 'dashboard' },
  { icon: ShoppingCart, label: 'Venta Rápida', path: '/pos', permissionKey: 'pos' },
  { icon: Package, label: 'Pedidos', path: '/orders', permissionKey: 'orders' },
  { icon: WashingMachine, label: 'Operaciones', path: '/operations', permissionKey: 'operations' },
  { icon: Truck, label: 'Entregas', path: '/deliveries', permissionKey: 'deliveries' },
  { icon: DollarSign, label: 'Caja', path: '/cash-register', permissionKey: 'cash_register' },
  { icon: RotateCcw, label: 'Devoluciones', path: '/returns', permissionKey: 'cash_register' },
  { icon: UserCircle, label: 'Clientes', path: '/customers', permissionKey: 'customers' },
  { icon: Boxes, label: 'Inventario', path: '/inventory', permissionKey: 'inventory' },
  { icon: ShoppingBag, label: 'Compras', path: '/purchases', permissionKey: 'purchases' },
  { icon: Tag, label: 'Catálogo', path: '/catalog', permissionKey: 'catalog' },
  { icon: BarChart3, label: 'Reportes', path: '/reports', permissionKey: 'reports' },
  { icon: Users, label: 'Empleados', path: '/employees', permissionKey: 'employees' },
  { icon: FileText, label: 'Auditoría', path: '/audit-logs', permissionKey: 'audit' },
  { icon: Settings, label: 'Configuración', path: '/settings', permissionKey: 'settings' },
];

export function AppSidebar() {
  const { user, logout } = useAuth();
  const { newOrderCount, clearCount } = useNewOrders();
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  if (!user) return null;

  const roleConfig = ROLE_CONFIG[user.role];
  const filteredNavItems = navItems.filter(item => user.permissions.includes(item.permissionKey));

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

      {/* User Info - Clickable for profile */}
      <div className={cn('p-4 border-b border-sidebar-border', collapsed && 'px-2')}>
        <button
          onClick={() => navigate('/my-portal')}
          className={cn(
            'flex items-center gap-3 w-full rounded-lg p-2 -m-2 transition-colors',
            'hover:bg-sidebar-accent group',
            collapsed && 'justify-center',
            location.pathname === '/my-portal' && 'bg-sidebar-primary'
          )}
        >
          <div className={cn('w-10 h-10 rounded-full flex items-center justify-center text-primary-foreground font-semibold relative', roleConfig.color)}>
            {user.name.charAt(0)}
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <User className="w-3 h-3 text-primary-foreground" />
            </div>
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0 text-left">
              <p className={cn('font-medium text-sm truncate group-hover:text-primary transition-colors', location.pathname === '/my-portal' && 'text-sidebar-primary-foreground')}>{user.name}</p>
              <p className={cn('text-xs text-sidebar-foreground/60', location.pathname === '/my-portal' && 'text-sidebar-primary-foreground/80')}>{roleConfig.labelEs}</p>
            </div>
          )}
        </button>

        {/* Owner Panel Link */}
        {user.role === 'owner' && (
          <button
            onClick={() => navigate('/owner-panel')}
            className={cn(
              'flex items-center gap-3 w-full rounded-lg p-2 mt-2 transition-colors',
              'hover:bg-amber-500/20 group border border-amber-500/30',
              collapsed && 'justify-center',
              location.pathname === '/owner-panel' && 'bg-amber-500/20 border-amber-500'
            )}
          >
            <Crown className="w-5 h-5 text-amber-500" />
            {!collapsed && (
              <span className="font-medium text-sm text-amber-500">Panel Propietario</span>
            )}
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-2">
        <ul className="space-y-1">
          {filteredNavItems.map((item) => {
            const isActive = location.pathname === item.path;
            const showBadge = item.path === '/orders' && newOrderCount > 0;
            
            return (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  onClick={() => {
                    // Clear badge when navigating to orders
                    if (item.path === '/orders') {
                      clearCount();
                    }
                  }}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 relative',
                    'hover:bg-sidebar-accent',
                    isActive && 'bg-sidebar-primary text-sidebar-primary-foreground',
                    collapsed && 'justify-center px-2'
                  )}
                >
                  <div className="relative">
                    <item.icon className="w-5 h-5 flex-shrink-0" />
                    {showBadge && collapsed && (
                      <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground animate-pulse">
                        {newOrderCount > 9 ? '9+' : newOrderCount}
                      </span>
                    )}
                  </div>
                  {!collapsed && (
                    <span className="font-medium flex-1">{item.label}</span>
                  )}
                  {showBadge && !collapsed && (
                    <Badge 
                      variant="destructive" 
                      className="ml-auto h-5 min-w-5 px-1.5 text-xs animate-pulse"
                    >
                      {newOrderCount > 99 ? '99+' : newOrderCount}
                    </Badge>
                  )}
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
