import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  CreditCard, 
  Calendar, 
  Clock, 
  CheckCircle2,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { SubscriptionStatusBadge } from './SubscriptionStatusBadge';
import { formatCurrency } from '@/lib/currency';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface SubscriptionCardProps {
  onManageClick?: () => void;
}

export function SubscriptionCard({ onManageClick }: SubscriptionCardProps) {
  const { 
    subscription, 
    plan, 
    loading, 
    checkResult,
    getTrialDaysRemaining,
    canManageSubscription
  } = useSubscription();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32 mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!subscription || !plan) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sin Suscripción</CardTitle>
          <CardDescription>Esta sucursal no tiene una suscripción activa</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={onManageClick}>
            <CreditCard className="mr-2 h-4 w-4" />
            Activar Suscripción
          </Button>
        </CardContent>
      </Card>
    );
  }

  const isTrialActive = subscription.status === 'trial';
  const trialDaysRemaining = getTrialDaysRemaining();
  const trialProgress = isTrialActive && plan.trial_days > 0
    ? ((plan.trial_days - trialDaysRemaining) / plan.trial_days) * 100
    : 0;

  const currentPrice = subscription.billing_interval === 'monthly' 
    ? plan.price_monthly 
    : plan.price_annual;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {plan.name}
              <SubscriptionStatusBadge 
                status={subscription.status} 
                daysRemaining={isTrialActive ? trialDaysRemaining : undefined}
              />
            </CardTitle>
            <CardDescription className="mt-1">
              {plan.description}
            </CardDescription>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">
              {formatCurrency(currentPrice, plan.currency)}
            </p>
            <p className="text-sm text-muted-foreground">
              /{subscription.billing_interval === 'monthly' ? 'mes' : 'año'}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Trial Progress */}
        {isTrialActive && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1">
                <Clock className="h-4 w-4" />
                Período de prueba
              </span>
              <span className="font-medium">
                {trialDaysRemaining} días restantes
              </span>
            </div>
            <Progress value={trialProgress} className="h-2" />
            {subscription.trial_ends_at && (
              <p className="text-xs text-muted-foreground">
                Termina el {format(new Date(subscription.trial_ends_at), "d 'de' MMMM, yyyy", { locale: es })}
              </p>
            )}
          </div>
        )}

        {/* Active subscription info */}
        {subscription.status === 'active' && subscription.current_period_end && (
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Próxima facturación</span>
            </div>
            <span className="text-sm font-medium">
              {format(new Date(subscription.current_period_end), "d 'de' MMMM, yyyy", { locale: es })}
            </span>
          </div>
        )}

        {/* Past due warning */}
        {subscription.status === 'past_due' && checkResult && (
          <div className="flex items-start gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-yellow-800">
                Pago vencido - {checkResult.daysUntilSuspension} días para suspensión
              </p>
              <p className="text-xs text-yellow-700 mt-1">
                Realiza el pago para evitar la suspensión del servicio.
              </p>
            </div>
          </div>
        )}

        {/* Suspended warning */}
        {subscription.status === 'suspended' && (
          <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800">
                Suscripción suspendida
              </p>
              <p className="text-xs text-red-700 mt-1">
                Realiza el pago para reactivar el servicio.
              </p>
            </div>
          </div>
        )}

        {/* Features */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Incluye:</p>
          <ul className="grid grid-cols-1 gap-2">
            {(plan.features as string[]).slice(0, 4).map((feature, index) => (
              <li key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                {feature}
              </li>
            ))}
          </ul>
        </div>

        {/* Actions */}
        {canManageSubscription() && (
          <div className="flex gap-2 pt-2">
            {(subscription.status === 'trial' || subscription.status === 'past_due' || subscription.status === 'suspended') && (
              <Button className="flex-1" onClick={onManageClick}>
                <CreditCard className="mr-2 h-4 w-4" />
                {subscription.status === 'trial' ? 'Activar Suscripción' : 'Realizar Pago'}
              </Button>
            )}
            {subscription.status === 'active' && (
              <Button variant="outline" className="flex-1" onClick={onManageClick}>
                Gestionar Suscripción
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
