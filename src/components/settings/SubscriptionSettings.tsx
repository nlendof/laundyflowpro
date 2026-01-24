import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  CreditCard, 
  History, 
  Settings2, 
  AlertTriangle,
  Building2,
  Copy,
  CheckCircle2,
  Clock,
  Mail,
  Phone,
  Upload
} from 'lucide-react';
import { SubscriptionCard } from '@/components/subscription/SubscriptionCard';
import { PaymentHistoryTable } from '@/components/subscription/PaymentHistoryTable';
import { PaymentReceiptUpload } from '@/components/subscription/PaymentReceiptUpload';
import { useSubscription, useSubscriptionPlans } from '@/hooks/useSubscription';
import { usePaymentService } from '@/hooks/usePaymentService';
import { useLaundryContext } from '@/contexts/LaundryContext';
import { formatCurrency } from '@/lib/currency';
import { toast } from 'sonner';

export function SubscriptionSettings() {
  const [activeTab, setActiveTab] = useState('overview');
  const [copiedAccount, setCopiedAccount] = useState<string | null>(null);
  
  const { subscription, payments, loading, canManageSubscription } = useSubscription();
  const { plans } = useSubscriptionPlans();
  const { branches, selectedBranchId } = useLaundryContext();
  const { 
    availableProviders, 
    allProviders, 
    getPaymentInstructions, 
    isProviderAvailable 
  } = usePaymentService();

  const currentBranch = branches.find(b => b.id === selectedBranchId);
  const bankTransferInstructions = getPaymentInstructions('bank_transfer');

  const handleCopyAccount = (accountNumber: string) => {
    navigator.clipboard.writeText(accountNumber);
    setCopiedAccount(accountNumber);
    toast.success('Número de cuenta copiado');
    setTimeout(() => setCopiedAccount(null), 2000);
  };

  const handleManageSubscription = () => {
    setActiveTab('payment');
  };

  return (
    <div className="space-y-6">
      {/* Branch indicator */}
      {currentBranch && (
        <Alert>
          <Building2 className="h-4 w-4" />
          <AlertTitle>Suscripción de Sucursal</AlertTitle>
          <AlertDescription>
            Estás viendo la suscripción de <strong>{currentBranch.name}</strong>. 
            Cada sucursal tiene su propia suscripción independiente.
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            <span className="hidden sm:inline">Resumen</span>
          </TabsTrigger>
          <TabsTrigger value="payment" className="flex items-center gap-2">
            <Settings2 className="h-4 w-4" />
            <span className="hidden sm:inline">Pago</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">Historial</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid gap-6 md:grid-cols-2">
            <SubscriptionCard onManageClick={handleManageSubscription} />
            
            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Información de Facturación</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {subscription && plans.length > 0 && (
                  <>
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-muted-foreground">Plan actual</span>
                      <span className="font-medium">
                        {plans.find(p => p.id === subscription.plan_id)?.name || 'Plan Profesional'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-muted-foreground">Ciclo de facturación</span>
                      <span className="font-medium">
                        {subscription.billing_interval === 'monthly' ? 'Mensual' : 'Anual'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-muted-foreground">Método de pago</span>
                      <Badge variant="outline">
                        {subscription.preferred_payment_method === 'card' ? 'Tarjeta' : 
                         subscription.preferred_payment_method === 'bank_transfer' ? 'Transferencia' : 
                         'Transferencia Bancaria'}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-muted-foreground">Total pagado</span>
                      <span className="font-medium text-primary">
                        {formatCurrency(
                          payments.filter(p => p.status === 'completed').reduce((sum, p) => sum + p.amount, 0),
                          'USD'
                        )}
                      </span>
                    </div>
                  </>
                )}

                {/* Available Payment Methods */}
                <Separator className="my-4" />
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Métodos de Pago Disponibles</h4>
                  <div className="space-y-2">
                    {allProviders.map((provider) => (
                      <div 
                        key={provider.type} 
                        className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                      >
                        <div className="flex items-center gap-2">
                          {provider.type === 'bank_transfer' ? (
                            <Building2 className="h-4 w-4" />
                          ) : (
                            <CreditCard className="h-4 w-4" />
                          )}
                          <span className="text-sm">{provider.displayName}</span>
                        </div>
                        <Badge variant={provider.isEnabled ? 'default' : 'secondary'}>
                          {provider.isEnabled ? 'Activo' : 'Próximamente'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="payment" className="mt-6">
          <div className="space-y-6">
            {/* Bank Transfer - Active Method */}
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

            {/* Upload Receipt Section */}
            <PaymentReceiptUpload />

            {/* Card Payment - Coming Soon */}
            <Card className="opacity-60">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5" />
                      Tarjeta de Crédito/Débito
                    </CardTitle>
                    <CardDescription>
                      Pago automático recurrente con Visa, Mastercard, AMEX
                    </CardDescription>
                  </div>
                  <Badge variant="secondary">Próximamente</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Los pagos con tarjeta estarán disponibles próximamente. 
                    Actualmente Stripe no opera en República Dominicana, pero estamos 
                    trabajando para habilitar esta opción lo antes posible.
                  </AlertDescription>
                </Alert>
                <Button disabled className="w-full mt-4">
                  Configurar Tarjeta (No disponible)
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Historial de Pagos</CardTitle>
              <CardDescription>
                Todos los pagos realizados para esta sucursal
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PaymentHistoryTable payments={payments} loading={loading} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
