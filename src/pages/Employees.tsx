import { useState, useMemo } from 'react';
import { User, UserRole } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Users,
  UserPlus,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Pencil,
  Trash2,
  Search,
  Phone,
  Mail,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  Key,
  Settings,
  Store,
  Truck,
  Wallet,
  Package,
  LayoutDashboard,
  ClipboardList,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Role configuration
const ROLE_CONFIG: Record<UserRole, { label: string; color: string; icon: React.ElementType; description: string }> = {
  admin: {
    label: 'Administrador',
    color: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
    icon: ShieldCheck,
    description: 'Acceso total a todas las funciones del sistema',
  },
  cajero: {
    label: 'Cajero',
    color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
    icon: Wallet,
    description: 'Gestión de caja, ventas y cobros',
  },
  operador: {
    label: 'Operador',
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    icon: Settings,
    description: 'Operaciones de lavado y procesamiento',
  },
  delivery: {
    label: 'Repartidor',
    color: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
    icon: Truck,
    description: 'Recogidas y entregas a domicilio',
  },
};

// Module permissions
const MODULES = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'pos', label: 'Venta Rápida', icon: Store },
  { key: 'orders', label: 'Pedidos', icon: ClipboardList },
  { key: 'operations', label: 'Operaciones', icon: Settings },
  { key: 'deliveries', label: 'Entregas', icon: Truck },
  { key: 'cash_register', label: 'Caja', icon: Wallet },
  { key: 'inventory', label: 'Inventario', icon: Package },
  { key: 'catalog', label: 'Catálogo', icon: FileText },
  { key: 'reports', label: 'Reportes', icon: FileText },
  { key: 'employees', label: 'Empleados', icon: Users },
  { key: 'settings', label: 'Configuración', icon: Settings },
] as const;

type ModuleKey = typeof MODULES[number]['key'];

// Default permissions by role
const DEFAULT_PERMISSIONS: Record<UserRole, ModuleKey[]> = {
  admin: MODULES.map(m => m.key),
  cajero: ['dashboard', 'pos', 'orders', 'cash_register'],
  operador: ['dashboard', 'orders', 'operations'],
  delivery: ['dashboard', 'deliveries'],
};

interface Employee extends User {
  phone?: string;
  hireDate: Date;
  isActive: boolean;
  permissions: ModuleKey[];
  lastLogin?: Date;
}

// Mock employees
const INITIAL_EMPLOYEES: Employee[] = [
  {
    id: '1',
    name: 'Carlos Administrador',
    email: 'admin@luiscap.com',
    role: 'admin',
    phone: '+52 55 1234 5678',
    hireDate: new Date('2023-01-15'),
    isActive: true,
    permissions: MODULES.map(m => m.key),
    lastLogin: new Date(),
  },
  {
    id: '2',
    name: 'María García',
    email: 'maria@luiscap.com',
    role: 'cajero',
    phone: '+52 55 9876 5432',
    hireDate: new Date('2023-06-20'),
    isActive: true,
    permissions: ['dashboard', 'pos', 'orders', 'cash_register'],
    lastLogin: new Date(Date.now() - 3600000),
  },
  {
    id: '3',
    name: 'Juan López',
    email: 'juan@luiscap.com',
    role: 'operador',
    phone: '+52 55 5555 1234',
    hireDate: new Date('2023-09-10'),
    isActive: true,
    permissions: ['dashboard', 'orders', 'operations'],
    lastLogin: new Date(Date.now() - 7200000),
  },
  {
    id: '4',
    name: 'Pedro Repartidor',
    email: 'pedro@luiscap.com',
    role: 'delivery',
    phone: '+52 55 4444 3333',
    hireDate: new Date('2024-01-05'),
    isActive: true,
    permissions: ['dashboard', 'deliveries'],
    lastLogin: new Date(Date.now() - 86400000),
  },
  {
    id: '5',
    name: 'Ana Martínez',
    email: 'ana@luiscap.com',
    role: 'cajero',
    phone: '+52 55 2222 1111',
    hireDate: new Date('2023-11-01'),
    isActive: false,
    permissions: ['dashboard', 'pos', 'orders', 'cash_register'],
  },
];

export default function Employees() {
  const { user: currentUser } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>(INITIAL_EMPLOYEES);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<UserRole | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  
  // New/Edit employee dialog
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'cajero' as UserRole,
    permissions: [] as ModuleKey[],
    isActive: true,
  });
  
  // Permissions dialog
  const [isPermissionsOpen, setIsPermissionsOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  const isAdmin = currentUser?.role === 'admin';

  // Filter employees
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      const matchesSearch = 
        emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.email.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesRole = filterRole === 'all' || emp.role === filterRole;
      const matchesStatus = 
        filterStatus === 'all' || 
        (filterStatus === 'active' && emp.isActive) ||
        (filterStatus === 'inactive' && !emp.isActive);
      
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [employees, searchQuery, filterRole, filterStatus]);

  // Stats
  const stats = useMemo(() => ({
    total: employees.length,
    active: employees.filter(e => e.isActive).length,
    inactive: employees.filter(e => !e.isActive).length,
    byRole: Object.keys(ROLE_CONFIG).reduce((acc, role) => {
      acc[role as UserRole] = employees.filter(e => e.role === role).length;
      return acc;
    }, {} as Record<UserRole, number>),
  }), [employees]);

  const handleOpenNewDialog = () => {
    setEditingEmployee(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      role: 'cajero',
      permissions: DEFAULT_PERMISSIONS['cajero'],
      isActive: true,
    });
    setIsDialogOpen(true);
  };

  const handleOpenEditDialog = (employee: Employee) => {
    setEditingEmployee(employee);
    setFormData({
      name: employee.name,
      email: employee.email,
      phone: employee.phone || '',
      role: employee.role,
      permissions: employee.permissions,
      isActive: employee.isActive,
    });
    setIsDialogOpen(true);
  };

  const handleRoleChange = (role: UserRole) => {
    setFormData(prev => ({
      ...prev,
      role,
      permissions: DEFAULT_PERMISSIONS[role],
    }));
  };

  const handleSaveEmployee = () => {
    if (!formData.name || !formData.email) {
      toast.error('Nombre y correo son requeridos');
      return;
    }

    if (editingEmployee) {
      // Update existing
      setEmployees(prev => prev.map(emp => 
        emp.id === editingEmployee.id 
          ? { ...emp, ...formData }
          : emp
      ));
      toast.success('Empleado actualizado correctamente');
    } else {
      // Create new
      const newEmployee: Employee = {
        id: crypto.randomUUID(),
        ...formData,
        hireDate: new Date(),
      };
      setEmployees(prev => [...prev, newEmployee]);
      toast.success('Empleado agregado correctamente');
    }

    setIsDialogOpen(false);
  };

  const handleToggleActive = (employee: Employee) => {
    setEmployees(prev => prev.map(emp =>
      emp.id === employee.id
        ? { ...emp, isActive: !emp.isActive }
        : emp
    ));
    toast.success(`Empleado ${employee.isActive ? 'desactivado' : 'activado'}`);
  };

  const handleDeleteEmployee = (employee: Employee) => {
    setEmployees(prev => prev.filter(emp => emp.id !== employee.id));
    toast.success('Empleado eliminado');
  };

  const handleOpenPermissions = (employee: Employee) => {
    setSelectedEmployee(employee);
    setIsPermissionsOpen(true);
  };

  const handleTogglePermission = (moduleKey: ModuleKey) => {
    if (!selectedEmployee) return;
    
    setEmployees(prev => prev.map(emp => {
      if (emp.id !== selectedEmployee.id) return emp;
      
      const hasPermission = emp.permissions.includes(moduleKey);
      const newPermissions = hasPermission
        ? emp.permissions.filter(p => p !== moduleKey)
        : [...emp.permissions, moduleKey];
      
      return { ...emp, permissions: newPermissions };
    }));

    setSelectedEmployee(prev => {
      if (!prev) return null;
      const hasPermission = prev.permissions.includes(moduleKey);
      return {
        ...prev,
        permissions: hasPermission
          ? prev.permissions.filter(p => p !== moduleKey)
          : [...prev.permissions, moduleKey],
      };
    });
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <ShieldAlert className="w-16 h-16 mx-auto text-red-500 mb-4" />
            <h2 className="text-xl font-bold mb-2">Acceso Restringido</h2>
            <p className="text-muted-foreground">
              Solo los administradores pueden acceder a la gestión de empleados.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold flex items-center gap-3">
            <Users className="w-8 h-8 text-primary" />
            Gestión de Empleados
          </h1>
          <p className="text-muted-foreground">Administra usuarios, roles y permisos</p>
        </div>

        <Button className="gap-2" onClick={handleOpenNewDialog}>
          <UserPlus className="w-4 h-4" />
          Nuevo Empleado
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card className="bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{stats.active}</p>
            <p className="text-xs text-green-600">Activos</p>
          </CardContent>
        </Card>
        {Object.entries(ROLE_CONFIG).map(([role, config]) => (
          <Card key={role}>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{stats.byRole[role as UserRole]}</p>
              <p className="text-xs text-muted-foreground">{config.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterRole} onValueChange={(v) => setFilterRole(v as UserRole | 'all')}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filtrar por rol" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los roles</SelectItem>
            {Object.entries(ROLE_CONFIG).map(([key, config]) => (
              <SelectItem key={key} value={key}>{config.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as 'all' | 'active' | 'inactive')}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Activos</SelectItem>
            <SelectItem value="inactive">Inactivos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Employees Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empleado</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead>Fecha Ingreso</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Último Acceso</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmployees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    No se encontraron empleados
                  </TableCell>
                </TableRow>
              ) : (
                filteredEmployees.map((employee) => {
                  const roleConfig = ROLE_CONFIG[employee.role];
                  const RoleIcon = roleConfig.icon;
                  
                  return (
                    <TableRow key={employee.id} className={cn(!employee.isActive && 'opacity-60')}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={employee.avatar} />
                            <AvatarFallback className="bg-primary/10 text-primary">
                              {employee.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{employee.name}</p>
                            <p className="text-sm text-muted-foreground">{employee.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn('gap-1', roleConfig.color)}>
                          <RoleIcon className="w-3 h-3" />
                          {roleConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {employee.phone && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Phone className="w-3.5 h-3.5" />
                            {employee.phone}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="w-3.5 h-3.5" />
                          {format(employee.hireDate, 'dd/MM/yyyy', { locale: es })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={employee.isActive ? 'default' : 'secondary'} className={cn(
                          employee.isActive 
                            ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                            : 'bg-gray-100 text-gray-500'
                        )}>
                          {employee.isActive ? (
                            <><CheckCircle className="w-3 h-3 mr-1" /> Activo</>
                          ) : (
                            <><XCircle className="w-3 h-3 mr-1" /> Inactivo</>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {employee.lastLogin ? (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Clock className="w-3.5 h-3.5" />
                            {format(employee.lastLogin, 'dd/MM HH:mm', { locale: es })}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button 
                            size="icon" 
                            variant="ghost"
                            onClick={() => handleOpenPermissions(employee)}
                            title="Permisos"
                          >
                            <Shield className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="icon" 
                            variant="ghost"
                            onClick={() => handleOpenEditDialog(employee)}
                            title="Editar"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="icon" 
                            variant="ghost"
                            onClick={() => handleToggleActive(employee)}
                            title={employee.isActive ? 'Desactivar' : 'Activar'}
                          >
                            {employee.isActive ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="icon" variant="ghost" className="text-red-600 hover:text-red-700">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Eliminar empleado?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta acción no se puede deshacer. Se eliminará permanentemente a {employee.name} del sistema.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction 
                                  className="bg-red-600 hover:bg-red-700"
                                  onClick={() => handleDeleteEmployee(employee)}
                                >
                                  Eliminar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* New/Edit Employee Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingEmployee ? (
                <><Pencil className="w-5 h-5" /> Editar Empleado</>
              ) : (
                <><UserPlus className="w-5 h-5" /> Nuevo Empleado</>
              )}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Nombre completo *</Label>
              <Input
                placeholder="Nombre del empleado"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Correo electrónico *</Label>
              <Input
                type="email"
                placeholder="correo@ejemplo.com"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Teléfono</Label>
              <Input
                type="tel"
                placeholder="+52 55 1234 5678"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Rol</Label>
              <Select value={formData.role} onValueChange={(v) => handleRoleChange(v as UserRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLE_CONFIG).map(([key, config]) => {
                    const Icon = config.icon;
                    return (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4" />
                          <div>
                            <span>{config.label}</span>
                          </div>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {ROLE_CONFIG[formData.role].description}
              </p>
            </div>
            
            <div className="flex items-center justify-between">
              <Label>Estado activo</Label>
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEmployee}>
              {editingEmployee ? 'Guardar Cambios' : 'Crear Empleado'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permissions Dialog */}
      <Dialog open={isPermissionsOpen} onOpenChange={setIsPermissionsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Permisos de Acceso
            </DialogTitle>
          </DialogHeader>
          
          {selectedEmployee && (
            <div className="space-y-4 pt-2">
              {/* Employee info */}
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Avatar>
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {selectedEmployee.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{selectedEmployee.name}</p>
                  <Badge className={cn('text-xs', ROLE_CONFIG[selectedEmployee.role].color)}>
                    {ROLE_CONFIG[selectedEmployee.role].label}
                  </Badge>
                </div>
              </div>
              
              {/* Permissions grid */}
              <div className="space-y-2">
                <p className="text-sm font-medium">Módulos con acceso:</p>
                <div className="grid grid-cols-2 gap-2">
                  {MODULES.map((module) => {
                    const Icon = module.icon;
                    const hasPermission = selectedEmployee.permissions.includes(module.key);
                    const isAdminModule = module.key === 'employees' || module.key === 'settings';
                    const isDisabled = selectedEmployee.role === 'admin'; // Admins always have all
                    
                    return (
                      <div
                        key={module.key}
                        className={cn(
                          "flex items-center justify-between p-3 rounded-lg border transition-colors",
                          hasPermission 
                            ? "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800"
                            : "bg-muted/30 border-transparent"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <Icon className={cn(
                            "w-4 h-4",
                            hasPermission ? "text-green-600" : "text-muted-foreground"
                          )} />
                          <span className={cn(
                            "text-sm",
                            hasPermission ? "font-medium" : "text-muted-foreground"
                          )}>
                            {module.label}
                          </span>
                        </div>
                        <Switch
                          checked={hasPermission}
                          onCheckedChange={() => handleTogglePermission(module.key)}
                          disabled={isDisabled}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
              
              {selectedEmployee.role === 'admin' && (
                <p className="text-xs text-muted-foreground text-center">
                  Los administradores tienen acceso a todos los módulos
                </p>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button onClick={() => setIsPermissionsOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
