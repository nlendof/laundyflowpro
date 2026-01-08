import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
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
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  Settings,
  Store,
  Truck,
  Wallet,
  Package,
  LayoutDashboard,
  ClipboardList,
  FileText,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

type AppRole = 'admin' | 'cajero' | 'operador' | 'delivery';

// Role configuration
const ROLE_CONFIG: Record<AppRole, { label: string; color: string; icon: React.ElementType; description: string }> = {
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
const DEFAULT_PERMISSIONS: Record<AppRole, ModuleKey[]> = {
  admin: MODULES.map(m => m.key),
  cajero: ['dashboard', 'pos', 'orders', 'cash_register'],
  operador: ['dashboard', 'orders', 'operations'],
  delivery: ['dashboard', 'deliveries'],
};

interface Employee {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar_url?: string;
  is_active: boolean;
  hire_date: string;
  last_login?: string;
  role: AppRole;
  permissions: string[];
}

export default function Employees() {
  const { user: currentUser } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<AppRole | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  
  // New/Edit employee dialog
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'cajero' as AppRole,
    permissions: [] as ModuleKey[],
    is_active: true,
  });
  const [isSaving, setIsSaving] = useState(false);
  
  // Permissions dialog
  const [isPermissionsOpen, setIsPermissionsOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  const isAdmin = currentUser?.role === 'admin';

  // Fetch employees from database
  const fetchEmployees = async () => {
    try {
      setIsLoadingData(true);
      
      // Fetch profiles with roles and permissions
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (profilesError) throw profilesError;
      
      // Fetch all roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');
      
      if (rolesError) throw rolesError;
      
      // Fetch all permissions
      const { data: permissions, error: permissionsError } = await supabase
        .from('user_permissions')
        .select('*');
      
      if (permissionsError) throw permissionsError;
      
      // Combine data
      const employeesData: Employee[] = (profiles || []).map(profile => {
        const userRole = roles?.find(r => r.user_id === profile.id);
        const userPermissions = permissions?.filter(p => p.user_id === profile.id) || [];
        
        return {
          id: profile.id,
          name: profile.name,
          email: profile.email,
          phone: profile.phone || undefined,
          avatar_url: profile.avatar_url || undefined,
          is_active: profile.is_active,
          hire_date: profile.hire_date,
          last_login: profile.last_login || undefined,
          role: (userRole?.role as AppRole) || 'cajero',
          permissions: userPermissions.map(p => p.module_key),
        };
      });
      
      setEmployees(employeesData);
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast.error('Error al cargar empleados');
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchEmployees();
    }
  }, [isAdmin]);

  // Filter employees
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      const matchesSearch = 
        emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.email.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesRole = filterRole === 'all' || emp.role === filterRole;
      const matchesStatus = 
        filterStatus === 'all' || 
        (filterStatus === 'active' && emp.is_active) ||
        (filterStatus === 'inactive' && !emp.is_active);
      
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [employees, searchQuery, filterRole, filterStatus]);

  // Stats
  const stats = useMemo(() => ({
    total: employees.length,
    active: employees.filter(e => e.is_active).length,
    inactive: employees.filter(e => !e.is_active).length,
    byRole: Object.keys(ROLE_CONFIG).reduce((acc, role) => {
      acc[role as AppRole] = employees.filter(e => e.role === role).length;
      return acc;
    }, {} as Record<AppRole, number>),
  }), [employees]);

  const handleOpenEditDialog = (employee: Employee) => {
    setEditingEmployee(employee);
    setFormData({
      name: employee.name,
      email: employee.email,
      phone: employee.phone || '',
      role: employee.role,
      permissions: employee.permissions as ModuleKey[],
      is_active: employee.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleRoleChange = async (role: AppRole) => {
    setFormData(prev => ({
      ...prev,
      role,
      permissions: DEFAULT_PERMISSIONS[role],
    }));
  };

  const handleSaveEmployee = async () => {
    if (!editingEmployee) return;
    
    setIsSaving(true);
    
    try {
      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          name: formData.name,
          phone: formData.phone || null,
          is_active: formData.is_active,
        })
        .eq('id', editingEmployee.id);
      
      if (profileError) throw profileError;
      
      // Update role if changed
      if (formData.role !== editingEmployee.role) {
        const { error: roleError } = await supabase
          .from('user_roles')
          .update({ role: formData.role })
          .eq('user_id', editingEmployee.id);
        
        if (roleError) throw roleError;
      }
      
      // Update permissions - delete all and re-insert
      const { error: deleteError } = await supabase
        .from('user_permissions')
        .delete()
        .eq('user_id', editingEmployee.id);
      
      if (deleteError) throw deleteError;
      
      if (formData.permissions.length > 0) {
        const { error: insertError } = await supabase
          .from('user_permissions')
          .insert(
            formData.permissions.map(moduleKey => ({
              user_id: editingEmployee.id,
              module_key: moduleKey,
            }))
          );
        
        if (insertError) throw insertError;
      }
      
      toast.success('Empleado actualizado correctamente');
      setIsDialogOpen(false);
      fetchEmployees();
    } catch (error) {
      console.error('Error updating employee:', error);
      toast.error('Error al actualizar empleado');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (employee: Employee) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: !employee.is_active })
        .eq('id', employee.id);
      
      if (error) throw error;
      
      toast.success(`Empleado ${employee.is_active ? 'desactivado' : 'activado'}`);
      fetchEmployees();
    } catch (error) {
      console.error('Error toggling employee status:', error);
      toast.error('Error al cambiar estado');
    }
  };

  const handleOpenPermissions = (employee: Employee) => {
    setSelectedEmployee(employee);
    setIsPermissionsOpen(true);
  };

  const handleTogglePermission = async (moduleKey: ModuleKey) => {
    if (!selectedEmployee) return;
    
    const hasPermission = selectedEmployee.permissions.includes(moduleKey);
    
    try {
      if (hasPermission) {
        // Remove permission
        const { error } = await supabase
          .from('user_permissions')
          .delete()
          .eq('user_id', selectedEmployee.id)
          .eq('module_key', moduleKey);
        
        if (error) throw error;
      } else {
        // Add permission
        const { error } = await supabase
          .from('user_permissions')
          .insert({
            user_id: selectedEmployee.id,
            module_key: moduleKey,
          });
        
        if (error) throw error;
      }
      
      // Update local state
      setSelectedEmployee(prev => {
        if (!prev) return null;
        return {
          ...prev,
          permissions: hasPermission
            ? prev.permissions.filter(p => p !== moduleKey)
            : [...prev.permissions, moduleKey],
        };
      });
      
      fetchEmployees();
    } catch (error) {
      console.error('Error toggling permission:', error);
      toast.error('Error al cambiar permiso');
    }
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

  if (isLoadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
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

        <Button variant="outline" className="gap-2" onClick={fetchEmployees}>
          <RefreshCw className="w-4 h-4" />
          Actualizar
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
              <p className="text-2xl font-bold">{stats.byRole[role as AppRole] || 0}</p>
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
        <Select value={filterRole} onValueChange={(v) => setFilterRole(v as AppRole | 'all')}>
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

      {/* Info */}
      <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
        <CardContent className="p-4 flex items-start gap-3">
          <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-blue-800 dark:text-blue-300">Gestión de Empleados</p>
            <p className="text-blue-600 dark:text-blue-400">
              Los nuevos empleados se registran desde la página de login. El primer usuario registrado es administrador automáticamente.
              Aquí puedes editar roles, permisos y estado de los empleados existentes.
            </p>
          </div>
        </CardContent>
      </Card>

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
                  const RoleIcon = roleConfig?.icon || Shield;
                  
                  return (
                    <TableRow key={employee.id} className={cn(!employee.is_active && 'opacity-60')}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={employee.avatar_url} />
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
                        <Badge className={cn('gap-1', roleConfig?.color)}>
                          <RoleIcon className="w-3 h-3" />
                          {roleConfig?.label || employee.role}
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
                          {format(new Date(employee.hire_date), 'dd/MM/yyyy', { locale: es })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={employee.is_active ? 'default' : 'secondary'} className={cn(
                          employee.is_active 
                            ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                            : 'bg-gray-100 text-gray-500'
                        )}>
                          {employee.is_active ? (
                            <><CheckCircle className="w-3 h-3 mr-1" /> Activo</>
                          ) : (
                            <><XCircle className="w-3 h-3 mr-1" /> Inactivo</>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {employee.last_login ? (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Clock className="w-3.5 h-3.5" />
                            {format(new Date(employee.last_login), 'dd/MM HH:mm', { locale: es })}
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
                            title={employee.is_active ? 'Desactivar' : 'Activar'}
                            disabled={employee.id === currentUser?.id}
                          >
                            {employee.is_active ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </Button>
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

      {/* Edit Employee Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-5 h-5" /> Editar Empleado
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Nombre completo</Label>
              <Input
                placeholder="Nombre del empleado"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Correo electrónico</Label>
              <Input
                type="email"
                value={formData.email}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">El correo no se puede cambiar</p>
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
              <Select 
                value={formData.role} 
                onValueChange={(v) => handleRoleChange(v as AppRole)}
                disabled={editingEmployee?.id === currentUser?.id}
              >
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
                          <span>{config.label}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {ROLE_CONFIG[formData.role]?.description}
              </p>
            </div>
            
            <div className="flex items-center justify-between">
              <Label>Estado activo</Label>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                disabled={editingEmployee?.id === currentUser?.id}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEmployee} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                'Guardar Cambios'
              )}
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
                  <Badge className={cn('text-xs', ROLE_CONFIG[selectedEmployee.role]?.color)}>
                    {ROLE_CONFIG[selectedEmployee.role]?.label || selectedEmployee.role}
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
                    const isDisabled = selectedEmployee.role === 'admin' || selectedEmployee.id === currentUser?.id;
                    
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
