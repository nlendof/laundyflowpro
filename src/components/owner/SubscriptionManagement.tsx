import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  CreditCard, 
  Building2, 
  Search, 
  RefreshCcw,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  Calendar,
  Eye
} from 'lucide-react';
import { SubscriptionStatusBadge } from '@/components/subscription/SubscriptionStatusBadge';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatCurrency } from '@/lib/currency';
import { toast } from 'sonner';

interface BranchWithSubscription {
  id: string;
  code: string;
  name: string;
  laundry_id: string;
  laundry_name: string;
  subscription?: {
    id: string;
    status: string;
    trial_ends_at: string | null;
    current_period_end: string | null;
    past_due_since: string | null;
    billing_interval: string;
    plan_name: string;
    plan_price_monthly: number;
    plan_price_annual: number;
    currency: string;
  } | null;
}

type StatusFilter = 'all' | 'trial' | 'active' | 'past_due' | 'suspended' | 'cancelled' | 'no_subscription';

export function SubscriptionManagement() {
  const [branches, setBranches] = useState<BranchWithSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const fetchBranches = async () => {
    try {
      setLoading(true);
      
      // Fetch all branches with their laundries
      const { data: branchesData, error: branchesError } = await supabase
        .from('branches')
        .select(`
          id,
          code,
          name,
          laundry_id,
          laundries!branches_laundry_id_fkey(name)
        `)
        .order('name');

      if (branchesError) throw branchesError;

      // Fetch all subscriptions
      const { data: subscriptionsData, error: subsError } = await supabase
        .from('branch_subscriptions')
        .select(`
          id,
          branch_id,
          status,
          trial_ends_at,
          current_period_end,
          past_due_since,
          billing_interval,
          subscription_plans(name, price_monthly, price_annual, currency)
        `);

      if (subsError) throw subsError;

      // Map subscriptions by branch_id
      const subsMap = new Map(
        subscriptionsData?.map(sub => [sub.branch_id, {
          id: sub.id,
          status: sub.status,
          trial_ends_at: sub.trial_ends_at,
          current_period_end: sub.current_period_end,
          past_due_since: sub.past_due_since,
          billing_interval: sub.billing_interval,
          plan_name: (sub.subscription_plans as any)?.name || 'Sin plan',
          plan_price_monthly: (sub.subscription_plans as any)?.price_monthly || 0,
          plan_price_annual: (sub.subscription_plans as any)?.price_annual || 0,
          currency: (sub.subscription_plans as any)?.currency || 'USD',
        }]) || []
      );

      // Combine data
      const combined: BranchWithSubscription[] = (branchesData || []).map(branch => ({
        id: branch.id,
        code: branch.code,
        name: branch.name,
        laundry_id: branch.laundry_id || '',
        laundry_name: (branch.laundries as any)?.name || 'Sin lavandería',
        subscription: subsMap.get(branch.id) || null,
      }));

      setBranches(combined);
    } catch (error) {
      console.error('Error fetching branches:', error);
      toast.error('Error al cargar suscripciones');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  // Filter and search
  const filteredBranches = branches.filter(branch => {
    // Search filter
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = 
      branch.name.toLowerCase().includes(searchLower) ||
      branch.code.toLowerCase().includes(searchLower) ||
      branch.laundry_name.toLowerCase().includes(searchLower);
    
    if (!matchesSearch) return false;

    // Status filter
    if (statusFilter === 'all') return true;
    if (statusFilter === 'no_subscription') return !branch.subscription;
    return branch.subscription?.status === statusFilter;
  });

  // Group by laundry
  const groupedByLaundry = filteredBranches.reduce((acc, branch) => {
    const key = branch.laundry_id || 'unknown';
    if (!acc[key]) {
      acc[key] = {
        laundry_name: branch.laundry_name,
        branches: []
      };
    }
    acc[key].branches.push(branch);
    return acc;
  }, {} as Record<string, { laundry_name: string; branches: BranchWithSubscription[] }>);

  // Sort laundries alphabetically
  const sortedLaundries = Object.entries(groupedByLaundry).sort((a, b) => 
    a[1].laundry_name.localeCompare(b[1].laundry_name)
  );

  // Stats
  const stats = {
    total: branches.length,
    trial: branches.filter(b => b.subscription?.status === 'trial').length,
    active: branches.filter(b => b.subscription?.status === 'active').length,
    pastDue: branches.filter(b => b.subscription?.status === 'past_due').length,
    suspended: branches.filter(b => b.subscription?.status === 'suspended').length,
    noSubscription: branches.filter(b => !b.subscription).length,
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'trial': return <Clock className="h-4 w-4 text-blue-500" />;
      case 'active': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'past_due': return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case 'suspended': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'cancelled': return <XCircle className="h-4 w-4 text-gray-500" />;
      default: return <CreditCard className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getNextDate = (branch: BranchWithSubscription) => {
    if (!branch.subscription) return '-';
    
    if (branch.subscription.status === 'trial' && branch.subscription.trial_ends_at) {
      return `Fin trial: ${format(new Date(branch.subscription.trial_ends_at), 'dd MMM yyyy', { locale: es })}`;
    }
    
    if (branch.subscription.current_period_end) {
      return format(new Date(branch.subscription.current_period_end), 'dd MMM yyyy', { locale: es });
    }
    
    return '-';
  };

  const getPrice = (branch: BranchWithSubscription) => {
    if (!branch.subscription) return '-';
    
    const price = branch.subscription.billing_interval === 'annual' 
      ? branch.subscription.plan_price_annual 
      : branch.subscription.plan_price_monthly;
    
    return formatCurrency(price, branch.subscription.currency || 'USD');
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="cursor-pointer hover:bg-muted/50" onClick={() => setStatusFilter('all')}>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-muted-foreground">Total</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-muted/50" onClick={() => setStatusFilter('trial')}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold text-blue-600">{stats.trial}</div>
              <Clock className="h-5 w-5 text-blue-500" />
            </div>
            <div className="text-sm text-muted-foreground">En prueba</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-muted/50" onClick={() => setStatusFilter('active')}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold text-green-600">{stats.active}</div>
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            </div>
            <div className="text-sm text-muted-foreground">Activas</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-muted/50" onClick={() => setStatusFilter('past_due')}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold text-amber-600">{stats.pastDue}</div>
              <AlertTriangle className="h-5 w-5 text-amber-500" />
            </div>
            <div className="text-sm text-muted-foreground">Pago pendiente</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-muted/50" onClick={() => setStatusFilter('suspended')}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold text-red-600">{stats.suspended}</div>
              <XCircle className="h-5 w-5 text-red-500" />
            </div>
            <div className="text-sm text-muted-foreground">Suspendidas</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Suscripciones por Sucursal
              </CardTitle>
              <CardDescription>
                Gestiona el estado de suscripción de todas las sucursales
              </CardDescription>
            </div>
            <Button onClick={fetchBranches} variant="outline" size="sm" className="gap-2">
              <RefreshCcw className="h-4 w-4" />
              Actualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por sucursal o lavandería..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="trial">En prueba</SelectItem>
                <SelectItem value="active">Activas</SelectItem>
                <SelectItem value="past_due">Pago pendiente</SelectItem>
                <SelectItem value="suspended">Suspendidas</SelectItem>
                <SelectItem value="cancelled">Canceladas</SelectItem>
                <SelectItem value="no_subscription">Sin suscripción</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredBranches.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No se encontraron sucursales</p>
            </div>
          ) : (
            <div className="space-y-6">
              {sortedLaundries.map(([laundryId, { laundry_name, branches: laundryBranches }]) => (
                <div key={laundryId} className="rounded-md border overflow-hidden">
                  {/* Laundry Header */}
                  <div className="bg-muted/50 px-4 py-3 border-b flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    <span className="font-semibold">{laundry_name}</span>
                    <Badge variant="secondary" className="ml-2">
                      {laundryBranches.length} {laundryBranches.length === 1 ? 'sucursal' : 'sucursales'}
                    </Badge>
                  </div>
                  
                  {/* Branches Table */}
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Sucursal</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead>Precio</TableHead>
                        <TableHead>Próxima fecha</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {laundryBranches.map((branch) => (
                        <TableRow key={branch.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{branch.name}</div>
                              <div className="text-xs text-muted-foreground">{branch.code}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {branch.subscription ? (
                              <SubscriptionStatusBadge status={branch.subscription.status as any} />
                            ) : (
                              <Badge variant="outline">Sin suscripción</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {getStatusIcon(branch.subscription?.status)}
                              <span>{branch.subscription?.plan_name || '-'}</span>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">
                            {getPrice(branch)}
                            {branch.subscription && (
                              <span className="text-xs text-muted-foreground ml-1">
                                /{branch.subscription.billing_interval === 'annual' ? 'año' : 'mes'}
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm">
                              <Calendar className="h-3 w-3 text-muted-foreground" />
                              {getNextDate(branch)}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
