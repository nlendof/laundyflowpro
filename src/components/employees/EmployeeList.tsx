import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Users,
  ShieldCheck,
  Pencil,
  Search,
  Phone,
  Calendar,
  CheckCircle,
  XCircle,
  Wallet,
  Package,
  Settings,
  Store,
  Truck,
  LayoutDashboard,
  ClipboardList,
  FileText,
  Loader2,
  Key,
  UserPlus,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CreateEmployeeModal } from './CreateEmployeeModal';

type AppRole = 'admin' | 'cajero' | 'operador' | 'delivery';

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

const MODULES = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'pos', label: 'Venta Rápida', icon: Store },
  { key: 'orders', label: 'Pedidos', icon: ClipboardList },
  { key: 'operations', label: 'Operaciones', icon: Settings },
  { key: 'deliveries', label: 'Entregas', icon: Truck },
  { key: 'cash_register', label: 'Caja', icon: Wallet },
  { key: 'customers', label: 'Clientes', icon: Users },
  { key: 'inventory', label: 'Inventario', icon: Package },
  { key: 'purchases', label: 'Compras', icon: Package },
  { key: 'catalog', label: 'Catálogo', icon: FileText },
  { key: 'reports', label: 'Reportes', icon: FileText },
  { key: 'employees', label: 'Empleados', icon: Users },
  { key: 'audit', label: 'Auditoría', icon: FileText },
  { key: 'settings', label: 'Configuración', icon: Settings },
] as const;

type ModuleKey = typeof MODULES[number]['key'];

const DEFAULT_PERMISSIONS: Record<AppRole, ModuleKey[]> = {
  admin: MODULES.map(m => m.key),
  cajero: ['dashboard', 'pos', 'orders', 'cash_register', 'customers'],
  operador: ['dashboard', 'orders', 'operations'],
  delivery: ['dashboard', 'deliveries'],
};

export interface Employee {
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

interface EmployeeListProps {
  employees: Employee[];
  onRefresh: () => void;
  currentUserId?: string;
}

export function EmployeeList({ employees, onRefresh, currentUserId }: EmployeeListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<AppRole | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  
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
  
  const [isPermissionsOpen, setIsPermissionsOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const filteredEmployees = employees.filter(emp => {
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

  const handleRoleChange = (role: AppRole) => {
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
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          name: formData.name,
          phone: formData.phone || null,
          is_active: formData.is_active,
        })
        .eq('id', editingEmployee.id);
      
      if (profileError) throw profileError;
      
      if (formData.role !== editingEmployee.role) {
        const { error: roleError } = await supabase
          .from('user_roles')
          .update({ role: formData.role })
          .eq('user_id', editingEmployee.id);
        
        if (roleError) throw roleError;
      }
      
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
      onRefresh();
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
      onRefresh();
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
        const { error } = await supabase
          .from('user_permissions')
          .delete()
          .eq('user_id', selectedEmployee.id)
          .eq('module_key', moduleKey);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_permissions')
          .insert({
            user_id: selectedEmployee.id,
            module_key: moduleKey,
          });
        
        if (error) throw error;
      }
      
      setSelectedEmployee(prev => {
        if (!prev) return null;
        return {
          ...prev,
          permissions: hasPermission
            ? prev.permissions.filter(p => p !== moduleKey)
            : [...prev.permissions, moduleKey],
        };
      });
      
      onRefresh();
    } catch (error) {
      console.error('Error toggling permission:', error);
      toast.error('Error al cambiar permiso');
    }
  };

  const handleDeleteEmployee = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await supabase.functions.invoke('delete-employee', {
        body: { userId: deleteTarget.id },
      });

      if (res.error) throw new Error(res.error.message);
      if (res.data?.error) throw new Error(res.data.error);

      toast.success('Empleado eliminado');
      setDeleteTarget(null);
      onRefresh();
    } catch (e) {
      console.error('Error deleting employee:', e);
      toast.error(e instanceof Error ? e.message : 'Error al eliminar empleado');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
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
        <Button onClick={() => setIsCreateModalOpen(true)} className="gap-2">
          <UserPlus className="w-4 h-4" />
          Nuevo Empleado
        </Button>
      </div>

      {/* Employees Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empleado</TableHead>
                  <TableHead>Contacto</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Ingreso</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No se encontraron empleados
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEmployees.map((employee) => {
                    const roleConfig = ROLE_CONFIG[employee.role];
                    const RoleIcon = roleConfig.icon;
                    const isCurrentUser = employee.id === currentUserId;
                    
                    return (
                      <TableRow key={employee.id} className={cn(!employee.is_active && 'opacity-60')}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarImage src={employee.avatar_url} />
                              <AvatarFallback>
                                {employee.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium flex items-center gap-2">
                                {employee.name}
                                {isCurrentUser && (
                                  <Badge variant="outline" className="text-xs">Tú</Badge>
                                )}
                              </p>
                              <p className="text-sm text-muted-foreground">{employee.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {employee.phone ? (
                            <div className="flex items-center gap-1 text-sm">
                              <Phone className="w-3 h-3" />
                              {employee.phone}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={cn('gap-1', roleConfig.color)}>
                            <RoleIcon className="w-3 h-3" />
                            {roleConfig.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {employee.is_active ? (
                            <Badge variant="outline" className="gap-1 text-green-600 border-green-200 bg-green-50">
                              <CheckCircle className="w-3 h-3" />
                              Activo
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="gap-1 text-red-600 border-red-200 bg-red-50">
                              <XCircle className="w-3 h-3" />
                              Inactivo
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(employee.hire_date), 'dd MMM yyyy', { locale: es })}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenPermissions(employee)}
                              title="Permisos"
                            >
                              <Key className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenEditDialog(employee)}
                              title="Editar"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            {!isCurrentUser && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setDeleteTarget(employee)}
                                  title="Eliminar"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                                <Switch
                                  checked={employee.is_active}
                                  onCheckedChange={() => handleToggleActive(employee)}
                                />
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Employee Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Empleado</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={formData.email} disabled className="bg-muted" />
            </div>
            
            <div className="space-y-2">
              <Label>Teléfono</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="Opcional"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Rol</Label>
              <Select value={formData.role} onValueChange={(v) => handleRoleChange(v as AppRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLE_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <config.icon className="w-4 h-4" />
                        {config.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center justify-between">
              <Label>Estado activo</Label>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEmployee} disabled={isSaving}>
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permissions Dialog */}
      <Dialog open={isPermissionsOpen} onOpenChange={setIsPermissionsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="w-5 h-5" />
              Permisos de {selectedEmployee?.name}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-3 py-4">
            {MODULES.map((module) => {
              const hasPermission = selectedEmployee?.permissions.includes(module.key) || false;
              const ModuleIcon = module.icon;
              
              return (
                <div
                  key={module.key}
                  className={cn(
                    'flex items-center justify-between p-3 rounded-lg border transition-colors',
                    hasPermission ? 'bg-primary/5 border-primary/20' : 'bg-muted/50'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <ModuleIcon className={cn('w-5 h-5', hasPermission ? 'text-primary' : 'text-muted-foreground')} />
                    <span className={cn(hasPermission ? 'font-medium' : 'text-muted-foreground')}>
                      {module.label}
                    </span>
                  </div>
                  <Switch
                    checked={hasPermission}
                    onCheckedChange={() => handleTogglePermission(module.key)}
                  />
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar empleado</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción elimina la cuenta y revoca el acceso. ¿Seguro que deseas eliminar a {deleteTarget?.name}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ variant: 'destructive' })}
              onClick={(e) => {
                e.preventDefault();
                handleDeleteEmployee();
              }}
              disabled={isDeleting}
            >
              {isDeleting ? 'Eliminando…' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Employee Modal */}
      <CreateEmployeeModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          setIsCreateModalOpen(false);
          onRefresh();
        }}
      />
    </div>
  );
}
