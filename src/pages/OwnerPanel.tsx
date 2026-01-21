import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
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
  Building2, 
  Plus, 
  Edit, 
  Trash2, 
  Loader2, 
  MapPin, 
  Phone, 
  Mail,
  Crown,
  Store,
  Users,
  Settings,
  ChevronRight,
  Power,
  AlertTriangle,
  ArrowLeft,
  UserPlus,
  Eye,
  EyeOff,
  RotateCcw,
  Wrench,
  Activity,
} from 'lucide-react';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { TechnicianManagement } from '@/components/owner/TechnicianManagement';
import { SystemMaintenanceTools } from '@/components/owner/SystemMaintenanceTools';
import { DeleteLaundryDialog } from '@/components/owner/DeleteLaundryDialog';
import { TechnicianMonitoringDashboard } from '@/components/owner/TechnicianMonitoringDashboard';

interface Laundry {
  id: string;
  name: string;
  slug: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  is_active: boolean;
  subscription_status: string | null;
  created_at: string;
}

interface Branch {
  id: string;
  code: string;
  name: string;
  address: string | null;
  phone: string | null;
  is_active: boolean;
  is_main: boolean;
  laundry_id: string;
}

interface LaundryUser {
  id: string;
  user_id: string;
  laundry_id: string;
  is_primary: boolean;
  profile?: {
    name: string;
    email: string;
    branch_id: string | null;
  };
  role?: string;
  branch?: {
    id: string;
    name: string;
    code: string;
  } | null;
}

export default function OwnerPanel() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [laundries, setLaundries] = useState<Laundry[]>([]);
  const [selectedLaundry, setSelectedLaundry] = useState<Laundry | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [laundryUsers, setLaundryUsers] = useState<LaundryUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Dialog states
  const [isLaundryDialogOpen, setIsLaundryDialogOpen] = useState(false);
  const [isBranchDialogOpen, setIsBranchDialogOpen] = useState(false);
  const [isEmployeeDialogOpen, setIsEmployeeDialogOpen] = useState(false);
  const [editingLaundry, setEditingLaundry] = useState<Laundry | null>(null);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [editingEmployee, setEditingEmployee] = useState<LaundryUser | null>(null);
  const [deletingEmployee, setDeletingEmployee] = useState<LaundryUser | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [resetBranchDialogOpen, setResetBranchDialogOpen] = useState(false);
  const [branchToReset, setBranchToReset] = useState<Branch | null>(null);
  const [resettingBranch, setResettingBranch] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [branchOrderCount, setBranchOrderCount] = useState<number | null>(null);
  const [loadingOrderCount, setLoadingOrderCount] = useState(false);
  const [deletingLaundry, setDeletingLaundry] = useState<Laundry | null>(null);
  const [isDeleteLaundryDialogOpen, setIsDeleteLaundryDialogOpen] = useState(false);
  
  // Form data
  const [laundryForm, setLaundryForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
  });
  
  const [branchForm, setBranchForm] = useState({
    code: '',
    name: '',
    address: '',
    phone: '',
    is_active: true,
    is_main: false,
  });

  const [employeeForm, setEmployeeForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'cajero' as 'admin' | 'cajero' | 'operador' | 'delivery',
    branch_id: '',
  });

  const ROLE_OPTIONS = [
    { value: 'admin', label: 'Administrador', description: 'Acceso completo a la lavandería' },
    { value: 'cajero', label: 'Cajero', description: 'Gestión de pedidos y caja' },
    { value: 'operador', label: 'Operador', description: 'Procesamiento de pedidos' },
    { value: 'delivery', label: 'Repartidor', description: 'Entregas y recolecciones' },
  ];

  const DEFAULT_PERMISSIONS: Record<string, string[]> = {
    admin: ['dashboard', 'orders', 'customers', 'catalog', 'inventory', 'cash_register', 'employees', 'reports', 'settings'],
    cajero: ['dashboard', 'orders', 'customers', 'cash_register'],
    operador: ['dashboard', 'orders', 'inventory'],
    delivery: ['dashboard', 'orders'],
  };

  // Check if user is owner or technician
  const isOwner = user?.role === 'owner' || user?.role === 'technician';
  const [activeMainTab, setActiveMainTab] = useState<'laundries' | 'monitoring' | 'technicians' | 'maintenance'>('laundries');

  useEffect(() => {
    if (!isOwner) {
      navigate('/dashboard');
      return;
    }
    fetchLaundries();
  }, [isOwner, navigate]);

  // Realtime subscription for laundry_users changes
  useEffect(() => {
    if (!selectedLaundry) return;

    const channel = supabase
      .channel(`laundry_users_${selectedLaundry.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'laundry_users',
          filter: `laundry_id=eq.${selectedLaundry.id}`,
        },
        () => {
          // Refresh the users list when any change occurs
          fetchLaundryUsers(selectedLaundry.id);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
        },
        () => {
          // Refresh when profiles change too (name updates, etc.)
          fetchLaundryUsers(selectedLaundry.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedLaundry?.id]);

  const fetchLaundries = async () => {
    try {
      setLoading(true);
      // @ts-ignore - laundries table exists but types not synced
      const { data, error } = await supabase
        .from('laundries')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLaundries((data || []) as Laundry[]);
    } catch (error) {
      console.error('Error fetching laundries:', error);
      toast.error('Error al cargar lavanderías');
    } finally {
      setLoading(false);
    }
  };

  const fetchBranches = async (laundryId: string) => {
    try {
      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .eq('laundry_id', laundryId)
        .order('is_main', { ascending: false })
        .order('name', { ascending: true });

      if (error) throw error;
      setBranches((data || []) as Branch[]);
    } catch (error) {
      console.error('Error fetching branches:', error);
    }
  };

  const fetchLaundryUsers = async (laundryId: string) => {
    try {
      // @ts-ignore - laundry_users table exists but types not synced
      const { data: luData, error: luError } = await supabase
        .from('laundry_users')
        .select('*')
        .eq('laundry_id', laundryId);

      if (luError) throw luError;

      const users = (luData || []) as unknown as { id: string; user_id: string; laundry_id: string; is_primary: boolean }[];
      const userIds = users.map(lu => lu.user_id);
      
      // Fetch profiles separately
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, name, email, branch_id')
        .in('id', userIds.length > 0 ? userIds : ['_none_']);
      
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', userIds.length > 0 ? userIds : ['_none_']);

      const profilesMap = new Map((profilesData || []).map(p => [p.id, p]));
      const branchIds = (profilesData || []).map(p => p.branch_id).filter(Boolean) as string[];
      
      const { data: branchesData } = await supabase
        .from('branches')
        .select('id, name, code')
        .in('id', branchIds.length > 0 ? branchIds : ['_none_']);

      const rolesMap = new Map(rolesData?.map(r => [r.user_id, r.role]) || []);
      const branchesMap = new Map(branchesData?.map(b => [b.id, b]) || []);

      const enriched = users.map((lu) => {
        const profile = profilesMap.get(lu.user_id) as
          | { name: string; email: string; branch_id: string | null }
          | undefined;

        return {
          ...lu,
          profile,
          role: (rolesMap.get(lu.user_id) as string) || 'sin rol',
          branch: profile?.branch_id
            ? (branchesMap.get(profile.branch_id) as { id: string; name: string; code: string }) || null
            : null,
        };
      });

      // Hide orphan rows (e.g. users already deleted but still linked in laundry_users)
      setLaundryUsers(enriched.filter((u) => !!u.profile));
    } catch (error) {
      console.error('Error fetching laundry users:', error);
    }
  };

  const handleSelectLaundry = async (laundry: Laundry) => {
    setSelectedLaundry(laundry);
    await Promise.all([
      fetchBranches(laundry.id),
      fetchLaundryUsers(laundry.id)
    ]);
  };

  const handleOpenLaundryDialog = (laundry?: Laundry) => {
    if (laundry) {
      setEditingLaundry(laundry);
      setLaundryForm({
        name: laundry.name,
        phone: laundry.phone || '',
        email: laundry.email || '',
        address: laundry.address || '',
      });
    } else {
      setEditingLaundry(null);
      setLaundryForm({ name: '', phone: '', email: '', address: '' });
    }
    setIsLaundryDialogOpen(true);
  };

  const handleSaveLaundry = async () => {
    if (!laundryForm.name.trim()) {
      toast.error('El nombre es requerido');
      return;
    }

    setSaving(true);
    try {
      if (editingLaundry) {
        // Update existing laundry
        const { error } = await supabase
          .from('laundries')
          .update({
            name: laundryForm.name,
            phone: laundryForm.phone || null,
            email: laundryForm.email || null,
            address: laundryForm.address || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingLaundry.id);

        if (error) throw error;
        toast.success('Lavandería actualizada');
      } else {
        // Create new laundry via edge function
        const { data, error } = await supabase.functions.invoke('create-laundry', {
          body: laundryForm,
        });

        if (error) throw error;
        if (data.error) throw new Error(data.error);
        toast.success('Lavandería creada exitosamente');
      }

      setIsLaundryDialogOpen(false);
      fetchLaundries();
      if (selectedLaundry && editingLaundry?.id === selectedLaundry.id) {
        setSelectedLaundry({ ...selectedLaundry, ...laundryForm });
      }
    } catch (error) {
      console.error('Error saving laundry:', error);
      toast.error(error instanceof Error ? error.message : 'Error al guardar lavandería');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleLaundryActive = async (laundry: Laundry) => {
    try {
      const { error } = await supabase
        .from('laundries')
        .update({ 
          is_active: !laundry.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq('id', laundry.id);

      if (error) throw error;
      
      toast.success(laundry.is_active ? 'Lavandería desactivada' : 'Lavandería activada');
      fetchLaundries();
      
      if (selectedLaundry?.id === laundry.id) {
        setSelectedLaundry({ ...selectedLaundry, is_active: !laundry.is_active });
      }
    } catch (error) {
      console.error('Error toggling laundry:', error);
      toast.error('Error al cambiar estado');
    }
  };

  const handleOpenBranchDialog = (branch?: Branch) => {
    if (branch) {
      setEditingBranch(branch);
      setBranchForm({
        code: branch.code,
        name: branch.name,
        address: branch.address || '',
        phone: branch.phone || '',
        is_active: branch.is_active,
        is_main: branch.is_main,
      });
    } else {
      setEditingBranch(null);
      setBranchForm({
        code: '',
        name: '',
        address: '',
        phone: '',
        is_active: true,
        is_main: false,
      });
    }
    setIsBranchDialogOpen(true);
  };

  const handleSaveBranch = async () => {
    if (!branchForm.code.trim() || !branchForm.name.trim()) {
      toast.error('El código y nombre son requeridos');
      return;
    }

    if (!selectedLaundry) return;

    if (!/^[A-Za-z0-9]+$/.test(branchForm.code) || branchForm.code.length > 10) {
      toast.error('El código debe ser alfanumérico (máx. 10 caracteres)');
      return;
    }

    setSaving(true);
    try {
      // If setting as main, unset other main branches
      if (branchForm.is_main && (!editingBranch || !editingBranch.is_main)) {
        await supabase
          .from('branches')
          .update({ is_main: false })
          .eq('laundry_id', selectedLaundry.id)
          .neq('id', editingBranch?.id || '');
      }

      if (editingBranch) {
        const { error } = await supabase
          .from('branches')
          .update({
            code: branchForm.code.toUpperCase(),
            name: branchForm.name,
            address: branchForm.address || null,
            phone: branchForm.phone || null,
            is_active: branchForm.is_active,
            is_main: branchForm.is_main,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingBranch.id);

        if (error) throw error;
        toast.success('Sucursal actualizada');
      } else {
        const { error } = await supabase
          .from('branches')
          .insert({
            code: branchForm.code.toUpperCase(),
            name: branchForm.name,
            address: branchForm.address || null,
            phone: branchForm.phone || null,
            is_active: branchForm.is_active,
            is_main: branchForm.is_main,
            laundry_id: selectedLaundry.id,
          });

        if (error) throw error;
        toast.success('Sucursal creada');
      }

      setIsBranchDialogOpen(false);
      fetchBranches(selectedLaundry.id);
    } catch (error: unknown) {
      console.error('Error saving branch:', error);
      if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === '23505') {
        toast.error('El código de sucursal ya existe');
      } else {
        toast.error('Error al guardar sucursal');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBranch = async (branch: Branch) => {
    if (branch.is_main) {
      toast.error('No se puede eliminar la sucursal principal');
      return;
    }

    if (!confirm(`¿Eliminar la sucursal "${branch.name}"?`)) return;

    try {
      const { error } = await supabase
        .from('branches')
        .delete()
        .eq('id', branch.id);

      if (error) throw error;
      toast.success('Sucursal eliminada');
      if (selectedLaundry) {
        fetchBranches(selectedLaundry.id);
      }
    } catch (error) {
      console.error('Error deleting branch:', error);
      toast.error('Error al eliminar sucursal');
    }
  };

  const openResetBranchDialog = async (branch: Branch) => {
    setBranchToReset(branch);
    setResetConfirmText('');
    setBranchOrderCount(null);
    setResetBranchDialogOpen(true);
    
    // Fetch order count
    setLoadingOrderCount(true);
    try {
      const { count, error } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('branch_id', branch.id);
      
      if (!error) {
        setBranchOrderCount(count || 0);
      }
    } catch (error) {
      console.error('Error fetching order count:', error);
    } finally {
      setLoadingOrderCount(false);
    }
  };

  const handleResetBranchData = async () => {
    if (!branchToReset) return;
    
    if (resetConfirmText !== 'BORRAR') {
      toast.error('Escribe BORRAR para confirmar');
      return;
    }

    setResettingBranch(true);
    try {
      const branchId = branchToReset.id;
      let deletedOrdersCount = 0;

      // Get orders from this branch
      const { data: branchOrders } = await supabase
        .from('orders')
        .select('id')
        .eq('branch_id', branchId);

      if (branchOrders && branchOrders.length > 0) {
        deletedOrdersCount = branchOrders.length;
        const orderIds = branchOrders.map(o => o.id);
        
        // Delete order items
        await supabase
          .from('order_items')
          .delete()
          .in('order_id', orderIds);

        // Delete order returns
        await supabase
          .from('order_returns')
          .delete()
          .in('order_id', orderIds);
      }

      // Delete orders from this branch
      await supabase
        .from('orders')
        .delete()
        .eq('branch_id', branchId);

      // Register audit log
      await supabase
        .from('audit_logs')
        .insert({
          user_id: user?.id,
          action: 'BRANCH_DATA_RESET',
          table_name: 'orders',
          record_id: branchId,
          old_data: {
            branch_id: branchId,
            branch_name: branchToReset.name,
            branch_code: branchToReset.code,
            laundry_id: selectedLaundry?.id,
            orders_deleted: deletedOrdersCount,
          },
          new_data: null,
          laundry_id: selectedLaundry?.id,
        });

      toast.success(`Datos de la sucursal "${branchToReset.name}" eliminados correctamente (${deletedOrdersCount} pedidos)`);
      setResetBranchDialogOpen(false);
      setBranchToReset(null);
      setResetConfirmText('');
    } catch (error) {
      console.error('Error resetting branch data:', error);
      toast.error('Error al borrar los datos de la sucursal');
    } finally {
      setResettingBranch(false);
    }
  };

  const handleOpenEmployeeDialog = (employee?: LaundryUser) => {
    if (employee) {
      setEditingEmployee(employee);
      setEmployeeForm({
        name: employee.profile?.name || '',
        email: employee.profile?.email || '',
        phone: '',
        password: '',
        role: (employee.role as 'admin' | 'cajero' | 'operador' | 'delivery') || 'cajero',
        branch_id: employee.profile?.branch_id || '',
      });
    } else {
      setEditingEmployee(null);
      setEmployeeForm({
        name: '',
        email: '',
        phone: '',
        password: generatePassword(),
        role: 'cajero',
        branch_id: '',
      });
    }
    setShowPassword(false);
    setIsEmployeeDialogOpen(true);
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 10; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const handleCreateEmployee = async () => {
    if (!employeeForm.name.trim() || !employeeForm.email.trim()) {
      toast.error('Nombre y email son requeridos');
      return;
    }

    if (!editingEmployee && !employeeForm.password.trim()) {
      toast.error('La contraseña es requerida para nuevos empleados');
      return;
    }

    if (!selectedLaundry) {
      toast.error('Selecciona una lavandería primero');
      return;
    }

    setSaving(true);
    try {
      if (editingEmployee) {
        // Update existing employee
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            name: employeeForm.name,
            branch_id: employeeForm.branch_id || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingEmployee.user_id);

        if (profileError) throw profileError;

        // Update role
        const { error: roleError } = await supabase
          .from('user_roles')
          .update({ role: employeeForm.role })
          .eq('user_id', editingEmployee.user_id);

        if (roleError) throw roleError;

        // Update permissions
        await supabase
          .from('user_permissions')
          .delete()
          .eq('user_id', editingEmployee.user_id);

        const newPermissions = DEFAULT_PERMISSIONS[employeeForm.role] || [];
        if (newPermissions.length > 0) {
          await supabase
            .from('user_permissions')
            .insert(newPermissions.map(perm => ({
              user_id: editingEmployee.user_id,
              module_key: perm,
            })));
        }

        toast.success('Empleado actualizado exitosamente');
      } else {
        // Create new employee
        const { data, error } = await supabase.functions.invoke('create-employee', {
          body: {
            appUrl: window.location.origin,
            email: employeeForm.email,
            password: employeeForm.password,
            name: employeeForm.name,
            phone: employeeForm.phone || undefined,
            role: employeeForm.role,
            permissions: DEFAULT_PERMISSIONS[employeeForm.role] || [],
            laundry_id: selectedLaundry.id,
            branch_id: employeeForm.branch_id || undefined,
          },
        });

        if (error) throw error;
        if (data.error) throw new Error(data.error);

        toast.success('Empleado creado exitosamente');
        if (data.emailSent) {
          toast.success('Credenciales enviadas por correo');
        } else {
          toast.info('Recuerda compartir las credenciales con el empleado');
        }
      }

      setIsEmployeeDialogOpen(false);
      setEditingEmployee(null);
      fetchLaundryUsers(selectedLaundry.id);
    } catch (error) {
      console.error('Error saving employee:', error);
      toast.error(error instanceof Error ? error.message : 'Error al guardar empleado');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEmployee = async () => {
    if (!deletingEmployee) return;

    const deletedUserId = deletingEmployee.user_id;

    if (deletingEmployee.is_primary) {
      toast.error('No se puede eliminar al usuario principal de la lavandería');
      setDeletingEmployee(null);
      return;
    }

    setIsDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke('delete-employee', {
        body: { user_id: deletedUserId },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success('Empleado eliminado exitosamente');

      // Remove immediately from UI, then re-sync from backend
      setLaundryUsers((prev) => prev.filter((u) => u.user_id !== deletedUserId));

      if (selectedLaundry) {
        fetchLaundryUsers(selectedLaundry.id);
      }
    } catch (error) {
      console.error('Error deleting employee:', error);
      toast.error(error instanceof Error ? error.message : 'Error al eliminar empleado');
    } finally {
      setIsDeleting(false);
      setDeletingEmployee(null);
    }
  };

  if (!isOwner) {
    return null;
  }
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            {selectedLaundry && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedLaundry(null)}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
            )}
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Crown className="w-8 h-8 text-amber-500" />
                Panel de Propietario
              </h1>
              <p className="text-muted-foreground">
                {selectedLaundry 
                  ? `Gestionando: ${selectedLaundry.name}`
                  : 'Gestiona todas tus lavanderías, técnicos y mantenimiento'
                }
              </p>
            </div>
          </div>
          {!selectedLaundry && activeMainTab === 'laundries' && (
            <Button onClick={() => handleOpenLaundryDialog()} className="gap-2">
              <Plus className="w-4 h-4" />
              Nueva Lavandería
            </Button>
          )}
        </div>

        {/* Main Tabs - Only show when no laundry is selected */}
        {!selectedLaundry ? (
          <Tabs value={activeMainTab} onValueChange={(v) => setActiveMainTab(v as any)} className="space-y-6">
            <TabsList className="grid w-full max-w-lg grid-cols-4">
              <TabsTrigger value="laundries" className="gap-2">
                <Building2 className="w-4 h-4" />
                <span className="hidden sm:inline">Lavanderías</span>
              </TabsTrigger>
              <TabsTrigger value="monitoring" className="gap-2">
                <Activity className="w-4 h-4" />
                <span className="hidden sm:inline">Monitoreo</span>
              </TabsTrigger>
              <TabsTrigger value="technicians" className="gap-2">
                <Wrench className="w-4 h-4" />
                <span className="hidden sm:inline">Técnicos</span>
              </TabsTrigger>
              <TabsTrigger value="maintenance" className="gap-2">
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">Mantenimiento</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="laundries">
              {/* Laundries List */}
          <div className="grid gap-4">
            {laundries.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Store className="w-16 h-16 text-muted-foreground/30 mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No hay lavanderías</h3>
                  <p className="text-muted-foreground mb-6">Crea tu primera lavandería para comenzar</p>
                  <Button onClick={() => handleOpenLaundryDialog()} className="gap-2">
                    <Plus className="w-4 h-4" />
                    Crear Lavandería
                  </Button>
                </CardContent>
              </Card>
            ) : (
              laundries.map((laundry) => (
                <Card 
                  key={laundry.id} 
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    !laundry.is_active ? 'opacity-60' : ''
                  }`}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div 
                        className="flex items-center gap-4 flex-1"
                        onClick={() => handleSelectLaundry(laundry)}
                      >
                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Store className="w-6 h-6 text-primary" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-lg">{laundry.name}</h3>
                            <Badge variant={laundry.is_active ? 'default' : 'secondary'}>
                              {laundry.is_active ? 'Activa' : 'Inactiva'}
                            </Badge>
                            <Badge variant="outline">
                              {laundry.subscription_status || 'trial'}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                            {laundry.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {laundry.phone}
                              </span>
                            )}
                            {laundry.email && (
                              <span className="flex items-center gap-1">
                                <Mail className="w-3 h-3" />
                                {laundry.email}
                              </span>
                            )}
                            {laundry.address && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {laundry.address}
                              </span>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleLaundryActive(laundry);
                          }}
                          title={laundry.is_active ? 'Desactivar' : 'Activar'}
                        >
                          <Power className={`w-4 h-4 ${laundry.is_active ? 'text-green-500' : 'text-muted-foreground'}`} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenLaundryDialog(laundry);
                          }}
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        {user?.role === 'owner' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeletingLaundry(laundry);
                              setIsDeleteLaundryDialogOpen(true);
                            }}
                            title="Eliminar lavandería"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
            </TabsContent>

            <TabsContent value="technicians">
              <TechnicianManagement />
            </TabsContent>

            <TabsContent value="monitoring">
              <TechnicianMonitoringDashboard />
            </TabsContent>

            <TabsContent value="maintenance">
              <SystemMaintenanceTools />
            </TabsContent>
          </Tabs>
        ) : (
          // Selected Laundry Details
          <Tabs defaultValue="branches" className="space-y-6">
            <TabsList>
              <TabsTrigger value="branches" className="gap-2">
                <Building2 className="w-4 h-4" />
                Sucursales
              </TabsTrigger>
              <TabsTrigger value="users" className="gap-2">
                <Users className="w-4 h-4" />
                Usuarios
              </TabsTrigger>
              <TabsTrigger value="settings" className="gap-2">
                <Settings className="w-4 h-4" />
                Configuración
              </TabsTrigger>
            </TabsList>

            <TabsContent value="branches" className="space-y-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Sucursales</CardTitle>
                    <CardDescription>
                      Administra las sucursales de {selectedLaundry.name}
                    </CardDescription>
                  </div>
                  <Button onClick={() => handleOpenBranchDialog()} className="gap-2">
                    <Plus className="w-4 h-4" />
                    Nueva Sucursal
                  </Button>
                </CardHeader>
                <CardContent>
                  {branches.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Building2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No hay sucursales configuradas</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Código</TableHead>
                          <TableHead>Nombre</TableHead>
                          <TableHead>Dirección</TableHead>
                          <TableHead>Teléfono</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {branches.map((branch) => (
                          <TableRow key={branch.id}>
                            <TableCell className="font-mono font-bold">
                              {branch.code}
                              {branch.is_main && (
                                <Badge variant="secondary" className="ml-2 text-xs">
                                  Principal
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="font-medium">{branch.name}</TableCell>
                            <TableCell className="text-muted-foreground">
                              {branch.address || '-'}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {branch.phone || '-'}
                            </TableCell>
                            <TableCell>
                              <Badge variant={branch.is_active ? 'default' : 'secondary'}>
                                {branch.is_active ? 'Activa' : 'Inactiva'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleOpenBranchDialog(branch)}
                                  title="Editar sucursal"
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-amber-600 hover:text-amber-700 hover:bg-amber-100"
                                  onClick={() => openResetBranchDialog(branch)}
                                  title="Restablecer datos de sucursal"
                                >
                                  <RotateCcw className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => handleDeleteBranch(branch)}
                                  disabled={branch.is_main}
                                  title="Eliminar sucursal"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="users" className="space-y-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Usuarios Asignados</CardTitle>
                    <CardDescription>
                      Usuarios con acceso a esta lavandería. Los admins de sucursal solo ven datos de su sucursal.
                    </CardDescription>
                  </div>
                  <Button onClick={() => handleOpenEmployeeDialog()} className="gap-2">
                    <UserPlus className="w-4 h-4" />
                    Nuevo Empleado
                  </Button>
                </CardHeader>
                <CardContent>
                  {laundryUsers.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No hay usuarios asignados</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nombre</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Rol</TableHead>
                          <TableHead>Sucursal Asignada</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {laundryUsers.map((lu) => (
                          <TableRow key={lu.id}>
                            <TableCell className="font-medium">
                              {lu.profile?.name || 'Sin nombre'}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {lu.profile?.email || '-'}
                            </TableCell>
                            <TableCell>
                              <Badge variant={lu.role === 'admin' ? 'default' : 'secondary'}>
                                {lu.role || 'sin rol'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {lu.branch ? (
                                <Badge variant="outline" className="gap-1">
                                  <Building2 className="w-3 h-3" />
                                  {lu.branch.code} - {lu.branch.name}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground text-sm">
                                  Todas las sucursales
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              {lu.is_primary && (
                                <Badge variant="default">Principal</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <select
                                  className="text-sm border rounded px-2 py-1 bg-background"
                                  value={lu.profile?.branch_id || ''}
                                  onChange={async (e) => {
                                    const branchId = e.target.value || null;
                                    try {
                                      const { error } = await supabase
                                        .from('profiles')
                                        .update({ branch_id: branchId })
                                        .eq('id', lu.user_id);
                                      if (error) throw error;
                                      toast.success('Sucursal actualizada');
                                      fetchLaundryUsers(selectedLaundry!.id);
                                    } catch (error) {
                                      console.error('Error updating branch:', error);
                                      toast.error('Error al actualizar sucursal');
                                    }
                                  }}
                                >
                                  <option value="">Todas</option>
                                  {branches.map(b => (
                                    <option key={b.id} value={b.id}>
                                      {b.code}
                                    </option>
                                  ))}
                                </select>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleOpenEmployeeDialog(lu)}
                                  title="Editar empleado"
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => setDeletingEmployee(lu)}
                                  title="Eliminar empleado"
                                  disabled={lu.is_primary}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

              {/* Info Card */}
              <Card className="bg-muted/50">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium mb-1">Permisos por Sucursal</p>
                      <ul className="text-muted-foreground space-y-1">
                        <li>• <strong>Owner:</strong> Ve todos los datos de todas las lavanderías</li>
                        <li>• <strong>Admin (sin sucursal):</strong> Ve todos los datos de su lavandería</li>
                        <li>• <strong>Admin (con sucursal):</strong> Solo ve datos de su sucursal asignada</li>
                        <li>• <strong>Empleados:</strong> Solo trabajan en su sucursal asignada</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="settings" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Configuración de Lavandería</CardTitle>
                  <CardDescription>
                    Información general y estado de {selectedLaundry.name}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label className="text-muted-foreground">Nombre</Label>
                      <p className="font-medium">{selectedLaundry.name}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Slug</Label>
                      <p className="font-mono text-sm">{selectedLaundry.slug}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Teléfono</Label>
                      <p>{selectedLaundry.phone || '-'}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Email</Label>
                      <p>{selectedLaundry.email || '-'}</p>
                    </div>
                    <div className="md:col-span-2">
                      <Label className="text-muted-foreground">Dirección</Label>
                      <p>{selectedLaundry.address || '-'}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <div className="flex items-center gap-3">
                      <Power className={`w-5 h-5 ${selectedLaundry.is_active ? 'text-green-500' : 'text-muted-foreground'}`} />
                      <div>
                        <p className="font-medium">Estado de la Lavandería</p>
                        <p className="text-sm text-muted-foreground">
                          {selectedLaundry.is_active 
                            ? 'Los usuarios pueden acceder y trabajar' 
                            : 'La lavandería está desactivada'
                          }
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={selectedLaundry.is_active}
                      onCheckedChange={() => handleToggleLaundryActive(selectedLaundry)}
                    />
                  </div>

                  {!selectedLaundry.is_active && (
                    <div className="flex items-start gap-3 p-4 bg-destructive/10 text-destructive rounded-lg">
                      <AlertTriangle className="w-5 h-5 mt-0.5" />
                      <div>
                        <p className="font-medium">Lavandería Desactivada</p>
                        <p className="text-sm opacity-80">
                          Los empleados no podrán acceder al sistema hasta que reactives la lavandería.
                        </p>
                      </div>
                    </div>
                  )}

                  <Button 
                    variant="outline" 
                    onClick={() => handleOpenLaundryDialog(selectedLaundry)}
                    className="gap-2"
                  >
                    <Edit className="w-4 h-4" />
                    Editar Información
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>

      {/* Laundry Dialog */}
      <Dialog open={isLaundryDialogOpen} onOpenChange={setIsLaundryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingLaundry ? 'Editar Lavandería' : 'Nueva Lavandería'}
            </DialogTitle>
            <DialogDescription>
              {editingLaundry 
                ? 'Actualiza la información de la lavandería' 
                : 'Crea una nueva lavandería para gestionar'
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nombre del Negocio *</Label>
              <Input
                placeholder="Lavandería Express"
                value={laundryForm.name}
                onChange={(e) => setLaundryForm({ ...laundryForm, name: e.target.value })}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Teléfono</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="+1 809 123 4567"
                    value={laundryForm.phone}
                    onChange={(e) => setLaundryForm({ ...laundryForm, phone: e.target.value })}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="contacto@lavanderia.com"
                    value={laundryForm.email}
                    onChange={(e) => setLaundryForm({ ...laundryForm, email: e.target.value })}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Dirección</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Av. Principal #123"
                  value={laundryForm.address}
                  onChange={(e) => setLaundryForm({ ...laundryForm, address: e.target.value })}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsLaundryDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveLaundry} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                'Guardar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Branch Dialog */}
      <Dialog open={isBranchDialogOpen} onOpenChange={setIsBranchDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingBranch ? 'Editar Sucursal' : 'Nueva Sucursal'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Código *</Label>
                <Input
                  placeholder="Ej: LC1, LC2"
                  value={branchForm.code}
                  onChange={(e) => setBranchForm({ ...branchForm, code: e.target.value.toUpperCase() })}
                  maxLength={10}
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  Se usará en el código de pedidos
                </p>
              </div>
              <div className="space-y-2">
                <Label>Nombre *</Label>
                <Input
                  placeholder="Sucursal Centro"
                  value={branchForm.name}
                  onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Dirección</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Av. Principal #123"
                  value={branchForm.address}
                  onChange={(e) => setBranchForm({ ...branchForm, address: e.target.value })}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Teléfono</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="+1 809 123 4567"
                  value={branchForm.phone}
                  onChange={(e) => setBranchForm({ ...branchForm, phone: e.target.value })}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div>
                <Label>Sucursal Activa</Label>
                <p className="text-xs text-muted-foreground">
                  Las sucursales inactivas no pueden crear pedidos
                </p>
              </div>
              <Switch
                checked={branchForm.is_active}
                onCheckedChange={(checked) => setBranchForm({ ...branchForm, is_active: checked })}
              />
            </div>
            
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div>
                <Label>Sucursal Principal</Label>
                <p className="text-xs text-muted-foreground">
                  Se usará como predeterminada para nuevos pedidos
                </p>
              </div>
              <Switch
                checked={branchForm.is_main}
                onCheckedChange={(checked) => setBranchForm({ ...branchForm, is_main: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBranchDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveBranch} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                'Guardar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Employee Dialog */}
      <Dialog open={isEmployeeDialogOpen} onOpenChange={(open) => {
        setIsEmployeeDialogOpen(open);
        if (!open) setEditingEmployee(null);
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingEmployee ? <Edit className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
              {editingEmployee ? 'Editar Empleado' : 'Nuevo Empleado'}
            </DialogTitle>
            <DialogDescription>
              {editingEmployee 
                ? `Actualiza la información de ${editingEmployee.profile?.name}`
                : `Crea un nuevo empleado para ${selectedLaundry?.name}`
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nombre completo *</Label>
              <Input
                placeholder="Juan Pérez"
                value={employeeForm.name}
                onChange={(e) => setEmployeeForm({ ...employeeForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Email {editingEmployee ? '' : '*'}</Label>
              <Input
                type="email"
                placeholder="juan@ejemplo.com"
                value={employeeForm.email}
                onChange={(e) => setEmployeeForm({ ...employeeForm, email: e.target.value })}
                disabled={!!editingEmployee}
                className={editingEmployee ? 'bg-muted' : ''}
              />
              {editingEmployee && (
                <p className="text-xs text-muted-foreground">El email no se puede cambiar</p>
              )}
            </div>
            {!editingEmployee && (
              <>
                <div className="space-y-2">
                  <Label>Teléfono</Label>
                  <Input
                    placeholder="+1 809 123 4567"
                    value={employeeForm.phone}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Contraseña *</Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={employeeForm.password}
                      onChange={(e) => setEmployeeForm({ ...employeeForm, password: e.target.value })}
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label>Rol *</Label>
              <Select
                value={employeeForm.role}
                onValueChange={(v) => setEmployeeForm({ ...employeeForm, role: v as 'admin' | 'cajero' | 'operador' | 'delivery' })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map(r => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Sucursal Asignada</Label>
              <Select
                value={employeeForm.branch_id || "all"}
                onValueChange={(v) => setEmployeeForm({ ...employeeForm, branch_id: v === "all" ? "" : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas las sucursales" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las sucursales</SelectItem>
                  {branches.map(b => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.code} - {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsEmployeeDialogOpen(false);
              setEditingEmployee(null);
            }}>
              Cancelar
            </Button>
            <Button onClick={handleCreateEmployee} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : (editingEmployee ? 'Guardar Cambios' : 'Crear Empleado')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Employee Confirmation Dialog */}
      <AlertDialog open={!!deletingEmployee} onOpenChange={(open) => !open && setDeletingEmployee(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar empleado?</AlertDialogTitle>
            <AlertDialogDescription>
              Estás a punto de eliminar a <strong>{deletingEmployee?.profile?.name || 'este empleado'}</strong>. 
              Esta acción no se puede deshacer y se eliminarán todos sus datos del sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteEmployee}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Eliminando...
                </>
              ) : (
                'Eliminar'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Branch Data Alert Dialog */}
      <AlertDialog open={resetBranchDialogOpen} onOpenChange={setResetBranchDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Restablecer datos de sucursal
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>
                  Estás a punto de <strong className="text-destructive">eliminar todos los datos</strong> de la sucursal <strong>"{branchToReset?.name}"</strong>.
                </p>
                
                {/* Order count display */}
                <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-medium text-destructive">Registros a eliminar:</span>
                    {loadingOrderCount ? (
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    ) : (
                      <Badge variant="destructive" className="text-lg px-3 py-1">
                        {branchOrderCount ?? 0} pedidos
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Incluye todos los artículos y devoluciones asociadas a estos pedidos.
                  </p>
                </div>

                <div className="p-3 bg-muted rounded-lg text-sm">
                  <p className="font-medium mb-2">Se mantendrán intactos:</p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>Configuración de la sucursal</li>
                    <li>Catálogo de servicios y artículos</li>
                    <li>Empleados y usuarios</li>
                    <li>Inventario</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <Label>Escribe <strong>BORRAR</strong> para confirmar:</Label>
                  <Input
                    value={resetConfirmText}
                    onChange={(e) => setResetConfirmText(e.target.value)}
                    placeholder="BORRAR"
                    className="font-mono"
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setBranchToReset(null);
              setResetConfirmText('');
            }}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResetBranchData}
              disabled={resetConfirmText !== 'BORRAR' || resettingBranch}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {resettingBranch ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Eliminando...
                </>
              ) : (
                <>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Restablecer
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Laundry Dialog */}
      <DeleteLaundryDialog
        laundry={deletingLaundry}
        open={isDeleteLaundryDialogOpen}
        onOpenChange={setIsDeleteLaundryDialogOpen}
        onDeleted={() => {
          setDeletingLaundry(null);
          fetchLaundries();
        }}
      />
    </div>
  );
}
