import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Users,
  ShieldAlert,
  ShieldCheck,
  Wallet,
  Settings,
  Truck,
  DollarSign,
  Receipt,
  Calendar,
  UserCheck,
  CalendarDays,
  Loader2,
  RefreshCw,
  HandCoins,
} from 'lucide-react';
import { toast } from 'sonner';
import { EmployeeList, type Employee } from '@/components/employees/EmployeeList';
import { SalaryManagement } from '@/components/employees/SalaryManagement';
import { PayrollManagement } from '@/components/employees/PayrollManagement';
import { ScheduleManagement } from '@/components/employees/ScheduleManagement';
import { AttendanceManagement } from '@/components/employees/AttendanceManagement';
import { TimeOffManagement } from '@/components/employees/TimeOffManagement';
import { LoanManagement } from '@/components/employees/LoanManagement';

type AppRole = 'admin' | 'cajero' | 'operador' | 'delivery';

const ROLE_CONFIG: Record<AppRole, { label: string; color: string; icon: React.ElementType }> = {
  admin: { label: 'Administrador', color: 'bg-purple-100 text-purple-700', icon: ShieldCheck },
  cajero: { label: 'Cajero', color: 'bg-green-100 text-green-700', icon: Wallet },
  operador: { label: 'Operador', color: 'bg-blue-100 text-blue-700', icon: Settings },
  delivery: { label: 'Repartidor', color: 'bg-orange-100 text-orange-700', icon: Truck },
};

export default function Employees() {
  const { user: currentUser } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [activeTab, setActiveTab] = useState('list');

  const isAdmin = currentUser?.role === 'admin';

  const fetchEmployees = async () => {
    try {
      setIsLoadingData(true);
      
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (profilesError) throw profilesError;
      
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');
      
      if (rolesError) throw rolesError;
      
      const { data: permissions, error: permissionsError } = await supabase
        .from('user_permissions')
        .select('*');
      
      if (permissionsError) throw permissionsError;
      
      const employeesData: Employee[] = (profiles || []).map(profile => {
        const userRole = roles?.find(r => r.user_id === profile.id);
        const userPermissions = permissions?.filter(p => p.user_id === profile.id) || [];
        
        return {
          id: profile.id,
          name: profile.name,
          email: profile.email,
          phone: profile.phone || undefined,
          avatar_url: profile.avatar_url || undefined,
          is_active: profile.is_active ?? true,
          hire_date: profile.hire_date || profile.created_at,
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

  const stats = useMemo(() => ({
    total: employees.length,
    active: employees.filter(e => e.is_active).length,
    byRole: Object.keys(ROLE_CONFIG).reduce((acc, role) => {
      acc[role as AppRole] = employees.filter(e => e.role === role).length;
      return acc;
    }, {} as Record<AppRole, number>),
  }), [employees]);

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
          <p className="text-muted-foreground">Administra usuarios, sueldos, horarios y más</p>
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

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-7 h-auto">
          <TabsTrigger value="list" className="gap-2 py-2">
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">Empleados</span>
          </TabsTrigger>
          <TabsTrigger value="salaries" className="gap-2 py-2">
            <DollarSign className="w-4 h-4" />
            <span className="hidden sm:inline">Sueldos</span>
          </TabsTrigger>
          <TabsTrigger value="payroll" className="gap-2 py-2">
            <Receipt className="w-4 h-4" />
            <span className="hidden sm:inline">Nómina</span>
          </TabsTrigger>
          <TabsTrigger value="loans" className="gap-2 py-2">
            <HandCoins className="w-4 h-4" />
            <span className="hidden sm:inline">Préstamos</span>
          </TabsTrigger>
          <TabsTrigger value="schedules" className="gap-2 py-2">
            <Calendar className="w-4 h-4" />
            <span className="hidden sm:inline">Horarios</span>
          </TabsTrigger>
          <TabsTrigger value="attendance" className="gap-2 py-2">
            <UserCheck className="w-4 h-4" />
            <span className="hidden sm:inline">Asistencia</span>
          </TabsTrigger>
          <TabsTrigger value="timeoff" className="gap-2 py-2">
            <CalendarDays className="w-4 h-4" />
            <span className="hidden sm:inline">Permisos</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          <EmployeeList
            employees={employees}
            onRefresh={fetchEmployees}
            currentUserId={currentUser?.id}
          />
        </TabsContent>

        <TabsContent value="salaries">
          <SalaryManagement employees={employees} onRefresh={fetchEmployees} />
        </TabsContent>

        <TabsContent value="payroll">
          <PayrollManagement employees={employees} />
        </TabsContent>

        <TabsContent value="loans">
          <LoanManagement employees={employees} />
        </TabsContent>

        <TabsContent value="schedules">
          <ScheduleManagement employees={employees} />
        </TabsContent>

        <TabsContent value="attendance">
          <AttendanceManagement employees={employees} />
        </TabsContent>

        <TabsContent value="timeoff">
          <TimeOffManagement employees={employees} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
