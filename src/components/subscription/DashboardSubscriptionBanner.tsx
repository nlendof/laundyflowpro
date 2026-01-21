import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSubscription } from '@/hooks/useSubscription';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  CreditCard, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Sparkles
} from 'lucide-react';

export function DashboardSubscriptionBanner() {
  const navigate = useNavigate();
  const { 
    subscription, 
    checkResult, 
    loading, 
    getTrialDaysRemaining 
  } = useSubscription();

  const bannerContent = useMemo(() => {
    if (loading || !checkResult) return null;

    const trialDays = getTrialDaysRemaining();

    switch (checkResult.status) {
      case 'trial':
        const trialProgress = subscription?.trial_ends_at 
          ? Math.max(0, Math.min(100, ((30 - trialDays) / 30) * 100))
          : 0;
        
        return {
          variant: 'trial' as const,
          icon: Sparkles,
          title: 'Período de Prueba',
          description: `Te quedan ${trialDays} días de prueba gratuita. Configura tu método de pago para continuar sin interrupciones.`,
          progress: trialProgress,
          showButton: trialDays <= 7,
          buttonText: 'Configurar Pago',
          className: 'border-primary/30 bg-primary/5',
          iconClass: 'text-primary',
        };

      case 'active':
        return {
          variant: 'active' as const,
          icon: CheckCircle,
          title: 'Suscripción Activa',
          description: 'Tu suscripción está al día. Todos los módulos están disponibles.',
          showButton: false,
          className: 'border-green-500/30 bg-green-500/5',
          iconClass: 'text-green-500',
        };

      case 'past_due':
        return {
          variant: 'past_due' as const,
          icon: AlertTriangle,
          title: 'Pago Pendiente',
          description: `Tienes ${checkResult.daysUntilSuspension} días para realizar el pago antes de que se suspenda el servicio.`,
          showButton: true,
          buttonText: 'Pagar Ahora',
          className: 'border-amber-500/30 bg-amber-500/5',
          iconClass: 'text-amber-500',
        };

      case 'suspended':
        return {
          variant: 'suspended' as const,
          icon: XCircle,
          title: 'Servicio Suspendido',
          description: 'Tu suscripción ha sido suspendida por falta de pago. Reactiva tu servicio para continuar operando.',
          showButton: true,
          buttonText: 'Reactivar Ahora',
          className: 'border-destructive/30 bg-destructive/5',
          iconClass: 'text-destructive',
        };

      case 'cancelled':
        return {
          variant: 'cancelled' as const,
          icon: XCircle,
          title: 'Suscripción Cancelada',
          description: 'Tu suscripción ha sido cancelada. Contacta soporte para reactivar.',
          showButton: true,
          buttonText: 'Contactar Soporte',
          className: 'border-muted-foreground/30 bg-muted/50',
          iconClass: 'text-muted-foreground',
        };

      default:
        return null;
    }
  }, [checkResult, loading, subscription, getTrialDaysRemaining]);

  if (!bannerContent) return null;

  // Don't show active status banner - only show when action needed
  if (bannerContent.variant === 'active') return null;

  const Icon = bannerContent.icon;

  return (
    <Alert className={`${bannerContent.className} mb-6`}>
      <Icon className={`h-5 w-5 ${bannerContent.iconClass}`} />
      <AlertTitle className="flex items-center justify-between">
        <span>{bannerContent.title}</span>
        {bannerContent.showButton && (
          <Button 
            size="sm" 
            onClick={() => navigate('/settings?tab=subscription')}
            className="ml-4"
          >
            <CreditCard className="h-4 w-4 mr-2" />
            {bannerContent.buttonText}
          </Button>
        )}
      </AlertTitle>
      <AlertDescription className="mt-2">
        {bannerContent.description}
        {bannerContent.progress !== undefined && (
          <div className="mt-3 space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Progreso del período de prueba</span>
              <span>{Math.round(bannerContent.progress)}%</span>
            </div>
            <Progress value={bannerContent.progress} className="h-2" />
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
}
