/**
 * Role Audit Panel - View and audit user roles across the platform
 * 
 * This component allows platform owners to:
 * - View all users grouped by role
 * - Identify users with missing laundry assignments
 * - Audit role distributions
 * - Export role reports
 */

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Loader2, 
  Search, 
  AlertTriangle, 
  CheckCircle, 
  Download,
  RefreshCw,
  Users,
  ShieldAlert,
  Building2,
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  SAAS_ROLE_CONFIG, 
  getRolesByLevel, 
  validateDeliveryLaundryAssignment,
  type AppRole,
  type RoleLevel,
} from '@/lib/roles';

interface AuditUser {
  id: string;
  name: string;
  email: string;
  role: AppRole;
  laundryId: string | null;
  laundryName: string | null;
  branchId: string | null;
  branchName: string | null;
  isActive: boolean;
  lastLogin: string | null;
  createdAt: string;
  hasIssues: boolean;
  issues: string[];
}

interface RoleStats {
  role: AppRole;
  count: number;
  activeCount: number;
  issueCount: number;
}

export function RoleAuditPanel() {
  const [users, setUsers] = useState<AuditUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [showIssuesOnly, setShowIssuesOnly] = useState(false);

  const rolesByLevel = getRolesByLevel();

  useEffect(() => {
    fetchAuditData();
  }, []);

  const fetchAuditData = async () => {
    setLoading(true);
    try {
      // Fetch all users with their roles, laundry and branch info
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          id,
          name,
          email,
          is_active,
          last_login,
          created_at,
          laundry_id,
          branch_id,
          laundries:laundry_id (id, name),
          branches:branch_id (id, name, code)
        `)
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch all user roles
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Create role lookup map
      const roleMap = new Map<string, AppRole>();
      rolesData?.forEach((r) => {
        roleMap.set(r.user_id, r.role as AppRole);
      });

      // Transform data
      const auditUsers: AuditUser[] = (profilesData || []).map((profile) => {
        const role = roleMap.get(profile.id) || 'cliente';
        const issues: string[] = [];

        // Check for laundry assignment issues
        const laundryValidation = validateDeliveryLaundryAssignment(role, profile.laundry_id);
        if (!laundryValidation.isValid && laundryValidation.message) {
          issues.push(laundryValidation.message);
        }

        // Check for branch-level roles without branch assignment
        if (['cajero', 'operador', 'delivery'].includes(role) && !profile.branch_id && !profile.laundry_id) {
          issues.push('Usuario sin asignación de lavandería ni sucursal');
        }

        return {
          id: profile.id,
          name: profile.name || 'Sin nombre',
          email: profile.email || '',
          role,
          laundryId: profile.laundry_id,
          laundryName: (profile.laundries as any)?.name || null,
          branchId: profile.branch_id,
          branchName: (profile.branches as any)?.name || null,
          isActive: profile.is_active ?? true,
          lastLogin: profile.last_login,
          createdAt: profile.created_at,
          hasIssues: issues.length > 0,
          issues,
        };
      });

      setUsers(auditUsers);
    } catch (error) {
      console.error('Error fetching audit data:', error);
      toast.error('Error al cargar datos de auditoría');
    } finally {
      setLoading(false);
    }
  };

  // Compute statistics
  const stats = useMemo((): RoleStats[] => {
    const statsMap = new Map<AppRole, RoleStats>();
    
    // Initialize all roles
    Object.keys(SAAS_ROLE_CONFIG).forEach((role) => {
      statsMap.set(role as AppRole, {
        role: role as AppRole,
        count: 0,
        activeCount: 0,
        issueCount: 0,
      });
    });

    // Count users
    users.forEach((user) => {
      const stat = statsMap.get(user.role);
      if (stat) {
        stat.count++;
        if (user.isActive) stat.activeCount++;
        if (user.hasIssues) stat.issueCount++;
      }
    });

    return Array.from(statsMap.values());
  }, [users]);

  // Filter users
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      // Search filter
      if (searchQuery) {
        const search = searchQuery.toLowerCase();
        if (!user.name.toLowerCase().includes(search) && 
            !user.email.toLowerCase().includes(search)) {
          return false;
        }
      }

      // Role filter
      if (filterRole !== 'all' && user.role !== filterRole) {
        return false;
      }

      // Level filter
      if (filterLevel !== 'all') {
        const rolesInLevel = rolesByLevel[filterLevel as RoleLevel] || [];
        if (!rolesInLevel.includes(user.role)) {
          return false;
        }
      }

      // Issues filter
      if (showIssuesOnly && !user.hasIssues) {
        return false;
      }

      return true;
    });
  }, [users, searchQuery, filterRole, filterLevel, showIssuesOnly, rolesByLevel]);

  // Export to CSV
  const exportToCSV = () => {
    const headers = ['Nombre', 'Email', 'Rol', 'Nivel SaaS', 'Lavandería', 'Sucursal', 'Estado', 'Problemas'];
    const rows = filteredUsers.map((user) => [
      user.name,
      user.email,
      SAAS_ROLE_CONFIG[user.role].labelEs,
      SAAS_ROLE_CONFIG[user.role].saasLabel,
      user.laundryName || '-',
      user.branchName || '-',
      user.isActive ? 'Activo' : 'Inactivo',
      user.issues.join('; ') || '-',
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `auditoria-roles-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Reporte exportado');
  };

  const totalIssues = stats.reduce((sum, s) => sum + s.issueCount, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{users.length}</p>
                <p className="text-sm text-muted-foreground">Total Usuarios</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{users.filter((u) => u.isActive).length}</p>
                <p className="text-sm text-muted-foreground">Usuarios Activos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <ShieldAlert className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalIssues}</p>
                <p className="text-sm text-muted-foreground">Con Problemas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Building2 className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {new Set(users.filter((u) => u.laundryId).map((u) => u.laundryId)).size}
                </p>
                <p className="text-sm text-muted-foreground">Lavanderías</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Issues Alert */}
      {totalIssues > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-amber-800">
                  Se detectaron {totalIssues} usuario(s) con problemas de configuración
                </h4>
                <p className="text-sm text-amber-700 mt-1">
                  Revisa los usuarios marcados para corregir asignaciones de lavandería o sucursal faltantes.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => setShowIssuesOnly(true)}
                >
                  Ver solo usuarios con problemas
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Auditoría de Roles</CardTitle>
              <CardDescription>
                Vista completa de usuarios y sus asignaciones en la jerarquía SaaS
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={fetchAuditData}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Actualizar
              </Button>
              <Button variant="outline" size="sm" onClick={exportToCSV}>
                <Download className="w-4 h-4 mr-2" />
                Exportar CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="users" className="space-y-4">
            <TabsList>
              <TabsTrigger value="users">Usuarios</TabsTrigger>
              <TabsTrigger value="stats">Estadísticas por Rol</TabsTrigger>
            </TabsList>

            <TabsContent value="users" className="space-y-4">
              {/* Filters */}
              <div className="flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nombre o email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>

                <Select value={filterLevel} onValueChange={setFilterLevel}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Nivel SaaS" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los niveles</SelectItem>
                    <SelectItem value="platform">Plataforma</SelectItem>
                    <SelectItem value="tenant">Tenant</SelectItem>
                    <SelectItem value="branch">Sucursal</SelectItem>
                    <SelectItem value="customer">Cliente</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filterRole} onValueChange={setFilterRole}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Rol" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los roles</SelectItem>
                    {Object.entries(SAAS_ROLE_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        {config.labelEs}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {showIssuesOnly && (
                  <Button variant="ghost" size="sm" onClick={() => setShowIssuesOnly(false)}>
                    Mostrar todos
                  </Button>
                )}
              </div>

              {/* Users Table */}
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuario</TableHead>
                      <TableHead>Rol</TableHead>
                      <TableHead>Nivel SaaS</TableHead>
                      <TableHead>Lavandería</TableHead>
                      <TableHead>Sucursal</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Problemas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No se encontraron usuarios con los filtros aplicados
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredUsers.map((user) => {
                        const roleConfig = SAAS_ROLE_CONFIG[user.role];
                        const RoleIcon = roleConfig.icon;
                        return (
                          <TableRow key={user.id} className={user.hasIssues ? 'bg-amber-50' : ''}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{user.name}</p>
                                <p className="text-sm text-muted-foreground">{user.email}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={`${roleConfig.bgColor} ${roleConfig.color} border-0`}>
                                <RoleIcon className="w-3 h-3 mr-1" />
                                {roleConfig.labelEs}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm">{roleConfig.saasLabel}</span>
                            </TableCell>
                            <TableCell>
                              {user.laundryName ? (
                                <span className="text-sm">{user.laundryName}</span>
                              ) : (
                                <span className="text-sm text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {user.branchName ? (
                                <span className="text-sm">{user.branchName}</span>
                              ) : (
                                <span className="text-sm text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant={user.isActive ? 'default' : 'secondary'}>
                                {user.isActive ? 'Activo' : 'Inactivo'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {user.hasIssues ? (
                                <div className="flex items-center gap-1">
                                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                                  <span className="text-xs text-amber-600">
                                    {user.issues.length} problema(s)
                                  </span>
                                </div>
                              ) : (
                                <CheckCircle className="w-4 h-4 text-green-500" />
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              <p className="text-sm text-muted-foreground">
                Mostrando {filteredUsers.length} de {users.length} usuarios
              </p>
            </TabsContent>

            <TabsContent value="stats">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {stats
                  .filter((s) => s.count > 0)
                  .sort((a, b) => b.count - a.count)
                  .map((stat) => {
                    const roleConfig = SAAS_ROLE_CONFIG[stat.role];
                    const RoleIcon = roleConfig.icon;
                    return (
                      <Card key={stat.role}>
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 ${roleConfig.bgColor} rounded-lg`}>
                                <RoleIcon className={`w-5 h-5 ${roleConfig.color}`} />
                              </div>
                              <div>
                                <h4 className="font-medium">{roleConfig.labelEs}</h4>
                                <p className="text-xs text-muted-foreground">{roleConfig.saasLabel}</p>
                              </div>
                            </div>
                            <span className="text-2xl font-bold">{stat.count}</span>
                          </div>
                          <div className="mt-4 flex gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Activos:</span>
                              <span className="ml-1 font-medium text-green-600">{stat.activeCount}</span>
                            </div>
                            {stat.issueCount > 0 && (
                              <div>
                                <span className="text-muted-foreground">Problemas:</span>
                                <span className="ml-1 font-medium text-amber-600">{stat.issueCount}</span>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
