import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  CreditCard, 
  History, 
  Settings2, 
  AlertTriangle,
  Building2
} from 'lucide-react';
import { SubscriptionCard } from '@/components/subscription/SubscriptionCard';
import { PaymentHistoryTable } from '@/components/subscription/PaymentHistoryTable';
import { useSubscription, useSubscriptionPlans } from '@/hooks/useSubscription';
import { useLaundryContext } from '@/contexts/LaundryContext';
import { formatCurrency } from '@/lib/currency';

export function SubscriptionSettings() {
  const [activeTab, setActiveTab] = useState('overview');
  const { subscription, payments, loading, canManageSubscription } = useSubscription();
  const { plans } = useSubscriptionPlans();
  const { branches, selectedBranchId } = useLaundryContext();

  const currentBranch = branches.find(b => b.id === selectedBranchId);

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
                      <span className="font-medium">
                        {subscription.preferred_payment_method === 'card' ? 'Tarjeta' : 
                         subscription.preferred_payment_method === 'bank_transfer' ? 'Transferencia' : 
                         'No configurado'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-muted-foreground">Total pagado</span>
                      <span className="font-medium">
                        {formatCurrency(
                          payments.filter(p => p.status === 'completed').reduce((sum, p) => sum + p.amount, 0),
                          'USD'
                        )}
                      </span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="payment" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Realizar Pago</CardTitle>
              <CardDescription>
                Selecciona un método de pago para tu suscripción
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Card Payment */}
              <div className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <CreditCard className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium">Tarjeta de Crédito/Débito</h4>
                    <p className="text-sm text-muted-foreground">
                      Pago automático recurrente
                    </p>
                  </div>
                </div>
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    La integración con Stripe será habilitada próximamente para procesar pagos con tarjeta.
                  </AlertDescription>
                </Alert>
                <Button disabled className="w-full">
                  Configurar Tarjeta (Próximamente)
                </Button>
              </div>

              {/* Bank Transfer */}
              <div className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium">Transferencia Bancaria</h4>
                    <p className="text-sm text-muted-foreground">
                      Confirmación manual requerida
                    </p>
                  </div>
                </div>
                <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
                  <p><strong>Banco:</strong> Banco Popular Dominicano</p>
                  <p><strong>Cuenta:</strong> 123-456789-0</p>
                  <p><strong>Tipo:</strong> Cuenta Corriente</p>
                  <p><strong>Nombre:</strong> LaundryFlow Pro SRL</p>
                  <p><strong>RNC:</strong> 1-23-45678-9</p>
                </div>
                <Alert>
                  <AlertDescription>
                    Después de realizar la transferencia, envía el comprobante a pagos@laundryflow.com 
                    para confirmar tu pago.
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
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
