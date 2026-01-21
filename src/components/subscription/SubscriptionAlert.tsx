import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Clock, CreditCard } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { useNavigate } from 'react-router-dom';

interface SubscriptionAlertProps {
  className?: string;
}

export function SubscriptionAlert({ className }: SubscriptionAlertProps) {
  const { checkResult, loading, getTrialDaysRemaining, subscription } = useSubscription();
  const navigate = useNavigate();

  if (loading || !checkResult) return null;

  // Don't show alert for active subscriptions
  if (checkResult.status === 'active') return null;

  const handleGoToPayment = () => {
    navigate('/settings?tab=subscription');
  };

  // Trial ending soon (less than 7 days)
  if (checkResult.status === 'trial') {
    const daysRemaining = getTrialDaysRemaining();
    if (daysRemaining > 7) return null;

    return (
      <Alert className={`border-blue-200 bg-blue-50 ${className}`}>
        <Clock className="h-4 w-4 text-blue-600" />
        <AlertTitle className="text-blue-800">Período de prueba</AlertTitle>
        <AlertDescription className="flex items-center justify-between">
          <span className="text-blue-700">
            Te quedan {daysRemaining} días de prueba gratuita.
          </span>
          <Button variant="outline" size="sm" onClick={handleGoToPayment}>
            <CreditCard className="mr-2 h-4 w-4" />
            Activar Plan
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // Past due - show warning
  if (checkResult.status === 'past_due') {
    return (
      <Alert className={`border-yellow-200 bg-yellow-50 ${className}`} variant="destructive">
        <AlertTriangle className="h-4 w-4 text-yellow-600" />
        <AlertTitle className="text-yellow-800">Pago pendiente</AlertTitle>
        <AlertDescription className="flex items-center justify-between">
          <span className="text-yellow-700">
            Tu pago está vencido. Tienes {checkResult.daysUntilSuspension} días para regularizarlo.
          </span>
          <Button variant="default" size="sm" onClick={handleGoToPayment}>
            <CreditCard className="mr-2 h-4 w-4" />
            Pagar Ahora
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // Suspended - critical
  if (checkResult.status === 'suspended') {
    return (
      <Alert className={`border-red-200 bg-red-50 ${className}`} variant="destructive">
        <AlertTriangle className="h-4 w-4 text-red-600" />
        <AlertTitle className="text-red-800">Suscripción suspendida</AlertTitle>
        <AlertDescription className="flex items-center justify-between">
          <span className="text-red-700">
            No puedes crear pedidos ni ventas. Regulariza tu pago para continuar.
          </span>
          <Button variant="destructive" size="sm" onClick={handleGoToPayment}>
            <CreditCard className="mr-2 h-4 w-4" />
            Reactivar
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}
