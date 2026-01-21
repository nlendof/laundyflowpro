import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CreditCard, 
  Building2,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  Calendar,
  Copy,
  Mail,
  Phone
} from 'lucide-react';
import { SubscriptionStatusBadge } from '@/components/subscription/SubscriptionStatusBadge';
import { SubscriptionCard } from '@/components/subscription/SubscriptionCard';
import { PaymentHistoryTable } from '@/components/subscription/PaymentHistoryTable';
import { usePaymentService } from '@/hooks/usePaymentService';
import { useLaundryContext } from '@/contexts/LaundryContext';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatCurrency } from '@/lib/currency';
import { toast } from 'sonner';

interface BranchSubscription {
  id: string;
  branch_id: string;
  branch_name: string;
  branch_code: string;
  status: string;
  trial_ends_at: string | null;
  current_period_end: string | null;
  past_due_since: string | null;
  billing_interval: string;
  plan_name: string;
  plan_price_monthly: number;
  plan_price_annual: number;
  currency: string;
}

interface Payment {
  id: string;
  subscription_id: string;
  amount: number;
  currency: string;
  payment_method: string;
  status: string;
  period_start: string;
  period_end: string;
  invoice_number: string | null;
  created_at: string;
}

/**
 * Vista de suscripciones para administradores:
 * - Admin general: ve todas las sucursales de su lavandería
 * - Admin de sucursal: ve solo su sucursal
 */
export function AdminSubscriptionView() {
  const { user } = useAuth();
  const { effectiveLaundryId, branches, selectedBranchId, isGeneralAdmin, isBranchAdmin } = useLaundryContext();
  const [subscriptions, setSubscriptions] = useState<BranchSubscription[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [copiedAccount, setCopiedAccount] = useState<string | null>(null);
  
  const { getPaymentInstructions } = usePaymentService();
  const bankTransferInstructions = getPaymentInstructions('bank_transfer');

  const fetchSubscriptions = async () => {
    if (!effectiveLaundryId) return;

    try {
      setLoading(true);
      
      // Get branches for this laundry
      let branchQuery = supabase
        .from('branches')
        .select('id, name, code')
        .eq('laundry_id', effectiveLaundryId);
      
      // If branch admin, filter to only their branch
      if (isBranchAdmin && selectedBranchId) {
        branchQuery = branchQuery.eq('id', selectedBranchId);
      }
      
      const { data: branchesData, error: branchesError } = await branchQuery;
      if (branchesError) throw branchesError;

      if (!branchesData || branchesData.length === 0) {
        setSubscriptions([]);
        setLoading(false);
        return;
      }

      const branchIds = branchesData.map(b => b.id);
      const branchMap = new Map(branchesData.map(b => [b.id, b]));

      // Fetch subscriptions for these branches
      const { data: subsData, error: subsError } = await supabase
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
        `)
        .in('branch_id', branchIds);

      if (subsError) throw subsError;

      // Map to combined structure
      const combined: BranchSubscription[] = (subsData || []).map(sub => {
        const branch = branchMap.get(sub.branch_id);
        return {
          id: sub.id,
          branch_id: sub.branch_id,
          branch_name: branch?.name || 'Sin nombre',
          branch_code: branch?.code || '',
          status: sub.status,
          trial_ends_at: sub.trial_ends_at,
          current_period_end: sub.current_period_end,
          past_due_since: sub.past_due_since,
          billing_interval: sub.billing_interval,
          plan_name: (sub.subscription_plans as any)?.name || 'Sin plan',
          plan_price_monthly: (sub.subscription_plans as any)?.price_monthly || 0,
          plan_price_annual: (sub.subscription_plans as any)?.price_annual || 0,
          currency: (sub.subscription_plans as any)?.currency || 'USD',
        };
      });

      setSubscriptions(combined);

      // Fetch payments for these subscriptions
      if (combined.length > 0) {
        const subIds = combined.map(s => s.id);
        const { data: paymentsData } = await supabase
          .from('subscription_payments')
          .select('*')
          .in('subscription_id', subIds)
          .order('created_at', { ascending: false })
          .limit(50);
        
        setPayments((paymentsData || []) as Payment[]);
      }

    } catch (error) {
      console.error('Error fetching subscriptions:', error);
      toast.error('Error al cargar suscripciones');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, [effectiveLaundryId, selectedBranchId, isBranchAdmin]);

  const handleCopyAccount = (accountNumber: string) => {
    navigator.clipboard.writeText(accountNumber);
    setCopiedAccount(accountNumber);
    toast.success('Número de cuenta copiado');
    setTimeout(() => setCopiedAccount(null), 2000);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'trial': return <Clock className="h-4 w-4 text-blue-500" />;
      case 'active': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'past_due': return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case 'suspended': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <CreditCard className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const needsAttention = subscriptions.filter(
    s => s.status === 'past_due' || s.status === 'suspended'
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Alert for subscriptions needing attention */}
      {needsAttention.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Atención Requerida</AlertTitle>
          <AlertDescription>
            {needsAttention.length === 1 
              ? `La sucursal ${needsAttention[0].branch_name} requiere atención inmediata.`
              : `${needsAttention.length} sucursales requieren atención inmediata.`
            }
          </AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <CreditCard className="h-6 w-6" />
            {isBranchAdmin ? 'Mi Suscripción' : 'Suscripciones'}
          </h2>
          <p className="text-muted-foreground">
            {isBranchAdmin 
              ? 'Gestiona la suscripción de tu sucursal' 
              : 'Gestiona las suscripciones de todas las sucursales'
            }
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview" className="gap-2">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">Resumen</span>
          </TabsTrigger>
          <TabsTrigger value="payment" className="gap-2">
            <CreditCard className="h-4 w-4" />
            <span className="hidden sm:inline">Pagar</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Historial</span>
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-6">
          {subscriptions.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Building2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">No hay suscripciones configuradas</p>
              </CardContent>
            </Card>
          ) : isBranchAdmin && subscriptions.length === 1 ? (
            // Single subscription view for branch admin
            <div className="grid gap-6 md:grid-cols-2">
              <SubscriptionCard onManageClick={() => setActiveTab('payment')} />
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Detalles del Plan</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-muted-foreground">Plan</span>
                    <span className="font-medium">{subscriptions[0].plan_name}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-muted-foreground">Ciclo</span>
                    <span className="font-medium">
                      {subscriptions[0].billing_interval === 'annual' ? 'Anual' : 'Mensual'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-muted-foreground">Precio</span>
                    <span className="font-medium text-primary">
                      {formatCurrency(
                        subscriptions[0].billing_interval === 'annual' 
                          ? subscriptions[0].plan_price_annual 
                          : subscriptions[0].plan_price_monthly,
                        subscriptions[0].currency
                      )}
                      /{subscriptions[0].billing_interval === 'annual' ? 'año' : 'mes'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            // Multi-subscription table for general admin
            <Card>
              <CardHeader>
                <CardTitle>Estado de Sucursales</CardTitle>
                <CardDescription>
                  Resumen del estado de suscripción de cada sucursal
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Sucursal</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead>Precio</TableHead>
                        <TableHead>Próximo vencimiento</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {subscriptions.map((sub) => (
                        <TableRow key={sub.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getStatusIcon(sub.status)}
                              <div>
                                <div className="font-medium">{sub.branch_name}</div>
                                <div className="text-xs text-muted-foreground">{sub.branch_code}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <SubscriptionStatusBadge status={sub.status as any} />
                          </TableCell>
                          <TableCell>{sub.plan_name}</TableCell>
                          <TableCell className="font-medium">
                            {formatCurrency(
                              sub.billing_interval === 'annual' 
                                ? sub.plan_price_annual 
                                : sub.plan_price_monthly,
                              sub.currency
                            )}
                          </TableCell>
                          <TableCell>
                            {sub.status === 'trial' && sub.trial_ends_at ? (
                              <span className="text-blue-600">
                                {format(new Date(sub.trial_ends_at), 'dd MMM yyyy', { locale: es })}
                              </span>
                            ) : sub.current_period_end ? (
                              format(new Date(sub.current_period_end), 'dd MMM yyyy', { locale: es })
                            ) : (
                              '-'
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Payment Tab */}
        <TabsContent value="payment" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Transferencia Bancaria
                  </CardTitle>
                  <CardDescription>
                    Método de pago activo - Confirmación en 24-48 horas hábiles
                  </CardDescription>
                </div>
                <Badge variant="default">Disponible</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Bank Accounts */}
              {bankTransferInstructions?.bankAccounts?.map((account, index) => (
                <div 
                  key={index} 
                  className="border rounded-lg p-4 space-y-3 bg-muted/30"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">{account.bankName}</h4>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleCopyAccount(account.accountNumber)}
                    >
                      {copiedAccount === account.accountNumber ? (
                        <CheckCircle2 className="h-4 w-4 mr-1 text-primary" />
                      ) : (
                        <Copy className="h-4 w-4 mr-1" />
                      )}
                      Copiar cuenta
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Cuenta:</span>
                      <p className="font-mono font-medium">{account.accountNumber}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Tipo:</span>
                      <p className="font-medium">{account.accountType}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Titular:</span>
                      <p className="font-medium">{account.accountHolder}</p>
                    </div>
                    {account.rnc && (
                      <div>
                        <span className="text-muted-foreground">RNC:</span>
                        <p className="font-medium">{account.rnc}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Instructions */}
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Pasos para completar el pago
                </h4>
                <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                  {bankTransferInstructions?.steps.map((step, index) => (
                    <li key={index}>{step}</li>
                  ))}
                </ol>
              </div>

              {/* Contact Info */}
              <div className="flex flex-wrap gap-4 pt-4 border-t">
                {bankTransferInstructions?.contactEmail && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a 
                      href={`mailto:${bankTransferInstructions.contactEmail}`}
                      className="text-primary hover:underline"
                    >
                      {bankTransferInstructions.contactEmail}
                    </a>
                  </div>
                )}
                {bankTransferInstructions?.contactPhone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a 
                      href={`tel:${bankTransferInstructions.contactPhone}`}
                      className="text-primary hover:underline"
                    >
                      {bankTransferInstructions.contactPhone}
                    </a>
                  </div>
                )}
              </div>

              {/* Notes */}
              {bankTransferInstructions?.notes && bankTransferInstructions.notes.length > 0 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Importante</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc list-inside space-y-1 mt-2">
                      {bankTransferInstructions.notes.map((note, index) => (
                        <li key={index}>{note}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Historial de Pagos</CardTitle>
              <CardDescription>
                {isBranchAdmin 
                  ? 'Todos los pagos realizados para tu sucursal'
                  : 'Todos los pagos realizados para las sucursales'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {payments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No hay pagos registrados</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Período</TableHead>
                        <TableHead>Método</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Monto</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell>
                            {format(new Date(payment.created_at), "d MMM yyyy", { locale: es })}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {format(new Date(payment.period_start), "d MMM", { locale: es })} - {format(new Date(payment.period_end), "d MMM yyyy", { locale: es })}
                          </TableCell>
                          <TableCell>
                            {payment.payment_method === 'card' ? 'Tarjeta' : 'Transferencia'}
                          </TableCell>
                          <TableCell>
                            <Badge variant={payment.status === 'completed' ? 'default' : 'secondary'}>
                              {payment.status === 'completed' ? 'Completado' : payment.status === 'pending' ? 'Pendiente' : payment.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(payment.amount, payment.currency)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
